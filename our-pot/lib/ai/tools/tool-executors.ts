/**
 * Client-side tool executors
 * These functions are called when the AI requests a tool
 * They are separate from tool schemas to support client-side execution
 *
 * Phase 1: Refactored to use transformation layer
 * Reference: doc/20251225-Implementation Plan-ChangeSet Rebuild.md
 */

import { ulid } from "ulid";
import { CategoryRepository } from "@/lib/data/repositories/CategoryRepository";
import { MemberRepository } from "@/lib/data/repositories/MemberRepository";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { validateTransactionProposal, validateCategoryProposal } from "../validation";
import { getTodayDateString } from "@/lib/utils";

// ============================================================================
// READ TOOL EXECUTORS
// ============================================================================

export async function executeGetCategories(db: any, accountId: string) {
  const repo = new CategoryRepository(db);
  const categories = await repo.getAllByAccount(accountId);

  return {
    success: true,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
    })),
  };
}

export async function executeGetMembers(db: any, accountId: string) {
  const repo = new MemberRepository(db);
  const members = await repo.getHumanMembersByAccount(accountId);

  return {
    success: true,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
    })),
  };
}

export async function executeSearchTransactions(
  db: any,
  accountId: string,
  params: {
    query?: string;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    memberId?: string;
    type?: "EXPENSE" | "DEPOSIT";
    limit?: number;
  }
) {
  const repo = new TransactionRepository(db);

  const filters: any = {
    accountId,
    limit: params.limit || 20,
  };

  if (params.startDate) filters.startDate = params.startDate;
  if (params.endDate) filters.endDate = params.endDate;
  if (params.categoryId) filters.categoryId = params.categoryId;
  if (params.memberId) filters.memberId = params.memberId;
  if (params.type) filters.type = params.type;

  let transactions;
  if (params.query) {
    transactions = await repo.search(accountId, params.query);
  } else {
    transactions = await repo.getAllByAccount(accountId, filters);
  }

  return {
    success: true,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount / 100, // Convert cents to decimal for AI
      merchant: t.merchant,
      description: t.description,
      categoryId: t.category_id,
      memberId: t.member_id,
      date: t.date,
    })),
    count: transactions.length,
  };
}

// ============================================================================
// HELPER: Get Kitty Member
// ============================================================================

export async function getKittyMemberId(db: any, accountId: string): Promise<string> {
  const repo = new MemberRepository(db);
  const kitty = await repo.getKittyMember(accountId);

  if (!kitty) {
    throw new Error("Kitty member not found. Please create a default Kitty member for this account.");
  }

  return kitty.id;
}

// ============================================================================
// PROPOSAL TOOL EXECUTORS
// ============================================================================

// Executor result types
export type ExecutorResult =
  | { success: true; enrichedToolInput: Record<string, unknown>; [key: string]: any }
  | { success: false; error?: string; errors?: any[] };

export async function executeCreateTransactionChangeRequest(
  db: any,
  accountId: string,
  params: {
    entityId?: string;
    type: "EXPENSE" | "DEPOSIT";
    amount: number;
    merchant?: string;
    description: string;
    categoryId?: string;
    memberId?: string;
    date?: string;
    action?: "UPSERT" | "DISCARD";
  }
): Promise<ExecutorResult> {
  // DISCARD: Special action (will be handled in transformation layer)
  if (params.action === "DISCARD") {
    const entityId = params.entityId;
    if (!entityId) {
      return { success: false, error: "entityId is required for DISCARD action" };
    }
    return {
      success: true,
      enrichedToolInput: { action: "DISCARD", entityId },
      message: `Removed transaction proposal from changeset`,
      entityId
    };
  }

  // BUSINESS LOGIC: Validate
  const validation = validateTransactionProposal({
    type: params.type,
    amount: params.amount,
    merchant: params.merchant,
    description: params.description,
    categoryId: params.categoryId,
    memberId: params.memberId,
    date: params.date,
  });
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  const converted = validation.converted!;

  // BUSINESS LOGIC: Apply defaults
  const memberId = converted.memberId || (await getKittyMemberId(db, accountId));
  const date = converted.date || getTodayDateString();
  const generatedId = ulid();

  // BUSINESS LOGIC: Build enriched tool input (database format)
  const enrichedToolInput: Record<string, unknown> = {
    action: params.action,
    reasoning: (params as any).reasoning,
    // Database format fields
    id: params.entityId || generatedId, // ID for database insertion
    account_id: accountId,
    member_id: memberId,
    category_id: converted.categoryId || null,
    type: converted.type,
    amount: converted.amount, // Already in cents
    merchant: converted.merchant || null,
    description: converted.description,
    date,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // For upserts (modifying existing proposal), include entityId
  // For new creates, entityId will be null in ChangeRequest
  if (params.entityId) {
    enrichedToolInput.entityId = params.entityId;
  }

  return {
    success: true,
    enrichedToolInput,
    message: `Added transaction proposal to changeset (will be created after approval)`,
    entityId: params.entityId || generatedId,
    amount: params.amount,
  };
}

export async function executeUpdateTransactionChangeRequest(
  _db: any,
  _accountId: string,
  params: {
    transactionId: string;
    amount?: number;
    merchant?: string;
    description?: string;
    categoryId?: string;
    memberId?: string;
    date?: string;
    action?: "UPSERT" | "DISCARD";
  }
): Promise<ExecutorResult> {
  // DISCARD: Special action (will be handled in transformation layer)
  if (params.action === "DISCARD") {
    return {
      success: true,
      enrichedToolInput: { action: "DISCARD", transactionId: params.transactionId },
      message: `Removed update proposal from changeset`,
      transactionId: params.transactionId
    };
  }

  // BUSINESS LOGIC: Build enriched tool input (only changed fields in database format)
  const enrichedToolInput: Record<string, unknown> = {
    transactionId: params.transactionId, // For extractEntityId to find
    action: params.action,
    reasoning: (params as any).reasoning,
  };

  if (params.amount !== undefined) enrichedToolInput.amount = Math.round(params.amount * 100); // Convert to cents
  if (params.merchant !== undefined) enrichedToolInput.merchant = params.merchant;
  if (params.description !== undefined) enrichedToolInput.description = params.description;
  if (params.categoryId !== undefined) enrichedToolInput.category_id = params.categoryId;
  if (params.memberId !== undefined) enrichedToolInput.member_id = params.memberId;
  if (params.date !== undefined) enrichedToolInput.date = params.date;
  enrichedToolInput.updated_at = new Date().toISOString();

  return {
    success: true,
    enrichedToolInput,
    message: `Added update proposal to changeset (will be applied after approval)`,
    transactionId: params.transactionId
  };
}

export async function executeDeleteTransactionChangeRequest(
  _db: any,
  _accountId: string,
  params: {
    transactionId: string;
    action?: "UPSERT" | "DISCARD";
  }
): Promise<ExecutorResult> {
  // DISCARD: Special action (will be handled in transformation layer)
  if (params.action === "DISCARD") {
    return {
      success: true,
      enrichedToolInput: { action: "DISCARD", transactionId: params.transactionId },
      message: `Removed delete proposal from changeset`,
      transactionId: params.transactionId
    };
  }

  // BUSINESS LOGIC: Build enriched tool input (for delete, only need ID)
  const enrichedToolInput = {
    transactionId: params.transactionId, // For extractEntityId to find
    action: params.action,
    reasoning: (params as any).reasoning,
  };

  return {
    success: true,
    enrichedToolInput,
    message: `Added delete proposal to changeset (will be applied after approval)`,
    transactionId: params.transactionId
  };
}

export async function executeCreateCategoryChangeRequest(
  _db: any,
  accountId: string,
  params: {
    entityId?: string;
    name: string;
    icon?: string;
    color?: string;
    action?: "UPSERT" | "DISCARD";
  }
): Promise<ExecutorResult> {
  // DISCARD: Special action (will be handled in transformation layer)
  if (params.action === "DISCARD") {
    const entityId = params.entityId;
    if (!entityId) {
      return { success: false, error: "entityId is required for DISCARD action" };
    }
    return {
      success: true,
      enrichedToolInput: { action: "DISCARD", entityId },
      message: `Removed category proposal from changeset`,
      entityId
    };
  }

  // BUSINESS LOGIC: Validate
  const validation = validateCategoryProposal({
    name: params.name,
    icon: params.icon,
    color: params.color,
  });
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  const converted = validation.converted!;

  // BUSINESS LOGIC: Generate ID for database
  const generatedId = ulid();

  // BUSINESS LOGIC: Build enriched tool input (database format)
  const enrichedToolInput: Record<string, unknown> = {
    action: params.action,
    reasoning: (params as any).reasoning,
    // Database format fields
    id: params.entityId || generatedId, // ID for database insertion
    account_id: accountId,
    name: converted.name,
    icon: converted.icon || null,
    color: converted.color || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  // For upserts (modifying existing proposal), include entityId
  // For new creates, entityId will be null in ChangeRequest
  if (params.entityId) {
    enrichedToolInput.entityId = params.entityId;
  }

  return {
    success: true,
    enrichedToolInput,
    message: `Added category proposal to changeset (will be created after approval)`,
    entityId: params.entityId || generatedId,
    name: converted.name
  };
}

// ============================================================================
// CONFIRMATION TOOL EXECUTORS
// ============================================================================

export interface ChangeSetConfirmationActions {
  transitionToPendingApproval: (metadata: {
    title: string;
    description?: string;
    toolCallId?: string;
  }, db: any) => Promise<string>;
  clearBuffer: () => void;
  getBufferAsArray: () => any[];
}

export async function executeConfirmChangeSet(
  changeSetActions: ChangeSetConfirmationActions,
  params: {
    title: string;
    description?: string;
  },
  toolCallId: string | undefined,
  db: any // Database instance
) {
  // Check if there are changes
  const buffer = changeSetActions.getBufferAsArray();

  if (buffer.length === 0) {
    return {
      success: false,
      error: "No changes to confirm. Add change requests before calling confirmChangeSet.",
    };
  }

  if (!db) {
    return {
      success: false,
      error: "Database not available. Cannot persist changeset.",
    };
  }

  try {
    // Transition to pending_approval AND persist to database
    const changesetId = await changeSetActions.transitionToPendingApproval(
      {
        title: params.title,
        description: params.description,
        toolCallId: toolCallId,
      },
      db
    );

    return {
      success: true,
      message: "Changeset submitted for review. Waiting for user approval...",
      changesetId,
      changeCount: buffer.length,
      status: "pending_approval",
    };
  } catch (error) {
    console.error("Failed to persist changeset:", error);
    return {
      success: false,
      error: `Failed to persist changeset: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function executeResetChangeSet(changeSetActions: ChangeSetConfirmationActions) {
  changeSetActions.clearBuffer();

  return {
    success: true,
    message: "Changeset cleared. Ready to start fresh.",
  };
}
