import { z } from "zod";
import { tool } from "ai"

/**
 * Tool schemas for client-side execution
 * These are sent to the AI but execution happens on the client
 */

// ============================================================================
// READ TOOLS (Immediate Execution)
// ============================================================================

export const getCategoriesTool = tool({
  description: "Fetch all active categories for the current account. Use this to see what categories are available when proposing expenses.",
  inputSchema: z.object({}),
});

export const getMembersTool = tool({
  description: "Fetch all active members for the current account (people who can pay for transactions). Use this to see who can be assigned to transactions.",
  inputSchema: z.object({}),
});

export const searchTransactionsTool = tool({
  description: "Search and filter transactions. Use this to find existing transactions before proposing updates or deletes. Returns transactions with amounts in decimal format (e.g., 42.50 for £42.50).",
  inputSchema: z.object({
    query: z.string().optional().describe("Text to search in merchant and description fields"),
    startDate: z.string().optional().describe("ISO date string for range start (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("ISO date string for range end (YYYY-MM-DD)"),
    categoryId: z.string().optional().describe("Filter by category ID"),
    memberId: z.string().optional().describe("Filter by member ID"),
    type: z.enum(["EXPENSE", "DEPOSIT"]).optional().describe("Filter by transaction type"),
    limit: z.number().optional().default(20).describe("Maximum results to return (default: 20)"),
  }),
});

// ============================================================================
// PROPOSAL TOOLS (Buffered)
// ============================================================================

export const createTransactionChangeRequestTool = tool({
  description: `Propose creating a NEW transaction (requires user approval).

CRITICAL: This tool is ONLY for creating NEW transactions. Do NOT provide entityId unless you want to update a previous proposal in the same changeset.

Amount handling: Provide amount as decimal (e.g., 42.50 for £42.50). The system will convert to pence automatically.

Upsert behavior within changeset: If you already proposed a transaction in THIS changeset and want to modify it, provide the same entityId. Otherwise, leave entityId EMPTY.

Action: Use "DISCARD" to remove a previously proposed transaction from the changeset.`,
  inputSchema: z.object({
    entityId: z.string().optional().describe("DO NOT PROVIDE for new transactions. Only provide if modifying a previous proposal in the current changeset. System generates IDs automatically."),
    type: z.enum(["EXPENSE", "DEPOSIT"]).describe("Transaction type: EXPENSE (money out) or DEPOSIT (money in)"),
    amount: z.number().positive().describe("Amount in currency format (e.g., 42.50 for £42.50). Must be positive with max 2 decimals"),
    merchant: z.string().optional().describe("Merchant or vendor name"),
    description: z.string().describe("Description of the transaction"),
    categoryId: z.string().optional().describe("Category ID (required for EXPENSE, optional for DEPOSIT)"),
    memberId: z.string().optional().describe("ID of member who paid. Defaults to Kitty if not specified"),
    date: z.string().optional().describe("Transaction date (ISO YYYY-MM-DD). Defaults to today"),
    action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT").describe('UPSERT (add/update) or DISCARD (remove from changeset)'),
  }),
});

export const updateTransactionChangeRequestTool = tool({
  description: `Propose updating an existing transaction (requires user approval). Only provide fields to change (partial update). Use searchTransactions() to find transaction IDs first.`,
  inputSchema: z.object({
    transactionId: z.string().describe("ID of the existing transaction to update"),
    amount: z.number().positive().optional().describe("New amount (decimal format). Only include if changing"),
    merchant: z.string().optional(),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    memberId: z.string().optional(),
    date: z.string().optional().describe("ISO YYYY-MM-DD"),
    action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT"),
  }),
});


export const deleteTransactionChangeRequestTool = tool({
  description: `Propose soft-deleting an existing transaction (requires user approval). Transaction marked deleted but preserved in database.`,
  inputSchema: z.object({
    transactionId: z.string().describe("ID of transaction to delete"),
    action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT"),
  }),
});


export const createCategoryChangeRequestTool = tool({
  description: `Propose creating a new category (requires user approval).`,
  inputSchema: z.object({
    entityId: z.string().optional().describe("Unique ID for this change request. Provide same ID to update (upsert)"),
    name: z.string().describe("Category name (e.g., 'Groceries', 'Transport')"),
    icon: z.string().optional().describe("Optional emoji or icon identifier"),
    color: z.string().optional().describe("Optional hex color code (e.g., '#4CAF50')"),
    action: z.enum(["UPSERT", "DISCARD"]).optional().default("UPSERT"),
  }),
});

// ============================================================================
// CONFIRMATION TOOLS
// ============================================================================

export const confirmChangeSetTool = tool({
  description: `Submit accumulated changes for user review and approval. AI stream pauses, user sees review widget. User can approve (execute), reject with feedback (return to building), or reject completely (discard).

After calling this:
1. User will see all proposed changes
2. They can approve (changes execute) or reject (you can revise)
3. If rejected with feedback, you'll return to building state
4. Correct the specific issues mentioned and call confirmChangeSet again

Rejection handling:
- Rejected with feedback: Fix specific issues, re-submit
- Rejected completely: Start fresh with different approach`,
  inputSchema: z.object({
    title: z.string().describe("Short summary (e.g., 'Add groceries expense', 'Update rent payment')"),
    description: z.string().optional().describe("Detailed explanation of what's changing and why"),
  }),
});

export const resetChangeSetTool = tool({
  description: `Clear all accumulated changes and start fresh. Rare - usually user rejection handles this. Only use if you need to completely discard the current changeset and start over.`,
  inputSchema: z.object({}),
});

// ============================================================================
// TOOL REGISTRY
// ============================================================================

/**
 * All available tools for the AI
 * Client code will execute these based on tool calls from AI
 */
export const allTools = {
  // Read tools
  getCategories: getCategoriesTool,
  getMembers: getMembersTool,
  searchTransactions: searchTransactionsTool,

  // Proposal tools
  createTransactionChangeRequest: createTransactionChangeRequestTool,
  updateTransactionChangeRequest: updateTransactionChangeRequestTool,
  deleteTransactionChangeRequest: deleteTransactionChangeRequestTool,
  createCategoryChangeRequest: createCategoryChangeRequestTool,

  // Confirmation tools
  confirmChangeSet: confirmChangeSetTool,
  resetChangeSet: resetChangeSetTool,
};

export type ToolName = keyof typeof allTools;
