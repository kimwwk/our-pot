/**
 * Transformation Layer: Tool Input → Standard ChangeRequest
 *
 * This layer provides clean separation between:
 * - AI-facing tool schemas (entity-specific, natural parameters)
 * - Internal ChangeRequest format (standardized, execution-ready)
 *
 * Reference: doc/references/20251221-concept-changeset-transformation-layer.md
 */

import { ulid } from 'ulid';
import type {
  ChangeRequest,
  OperationType,
  EntityType,
} from './types';

// ============================================================================
// Tool Name Parsing
// ============================================================================

/**
 * Parse tool name to extract entity and operation
 *
 * Pattern: {operation}{EntityType}ChangeRequest
 * Example: "createTransactionChangeRequest" → { entity: "transaction", operation: "create" }
 *
 * @param toolName - The tool name from AI
 * @returns Parsed entity type and operation type
 */
export function parseChangeRequestToolName(toolName: string): {
  entity: EntityType;
  operation: OperationType;
} {
  // Match pattern: {operation}{Entity}ChangeRequest
  const match = toolName.match(/^(create|update|delete)([A-Z][a-zA-Z]+)ChangeRequest$/);

  if (!match) {
    throw new Error(`Invalid changeset tool name: ${toolName}. Expected pattern: {operation}{Entity}ChangeRequest`);
  }

  const [, operation, entityPascal] = match;
  const entity = entityPascal.toLowerCase() as EntityType;

  // Validate entity type
  const validEntities: EntityType[] = ['transaction', 'category', 'account', 'member'];
  if (!validEntities.includes(entity)) {
    throw new Error(`Unknown entity type: ${entity}. Valid types: ${validEntities.join(', ')}`);
  }

  return {
    entity,
    operation: operation as OperationType,
  };
}

// ============================================================================
// Entity ID Extraction
// ============================================================================

/**
 * Extract entity ID from tool input based on entity type and operation
 *
 * @param entity - The entity type
 * @param operation - The operation type
 * @param toolInput - The raw tool input
 * @returns Entity ID or null for creates
 */
export function extractEntityId(
  entity: EntityType,
  operation: OperationType,
  toolInput: Record<string, unknown>
): string | null {
  // Creates have no existing entity ID (null or temp ID for upsert)
  if (operation === 'create') {
    // Check if this is an upsert (modifying a previous proposal)
    const entityId = toolInput.entityId as string | undefined;
    return entityId || null;
  }

  // For updates/deletes, entity ID is required
  const entityIdFields: Record<EntityType, string> = {
    transaction: 'transactionId',
    category: 'categoryId',
    account: 'accountId',
    member: 'memberId',
  };

  const idField = entityIdFields[entity];
  const entityId = toolInput[idField];

  if (!entityId) {
    throw new Error(`Missing ${idField} for ${operation} operation on ${entity}`);
  }

  return String(entityId);
}

// ============================================================================
// Proposed Data Building
// ============================================================================

/**
 * Build proposed data from tool input
 * Removes metadata fields (reasoning, action) and entity ID fields
 *
 * @param entity - The entity type
 * @param operation - The operation type
 * @param toolInput - The raw tool input
 * @returns Proposed data object or null for deletes
 */
export function buildProposedData(
  entity: EntityType,
  operation: OperationType,
  toolInput: Record<string, unknown>
): Record<string, unknown> | null {
  // Deletes don't have proposed data
  if (operation === 'delete') {
    return null;
  }

  // Clone and remove metadata fields
  const { reasoning, action, entityId, ...data } = toolInput;

  // Remove entity-specific ID fields
  const entityIdFields: Record<EntityType, string> = {
    transaction: 'transactionId',
    category: 'categoryId',
    account: 'accountId',
    member: 'memberId',
  };

  const idField = entityIdFields[entity];
  delete data[idField];

  return data;
}

// ============================================================================
// Main Transformation Function
// ============================================================================

/**
 * Generic transformer - converts tool input to standard ChangeRequest
 *
 * This is the main entry point for transformation layer.
 * Tool executors call this with enriched tool input (after validation, defaults, conversions).
 *
 * @param entity - The entity type
 * @param operation - The operation type
 * @param toolInput - The raw/enriched tool input from AI
 * @param currentData - Current data from database (for updates/deletes, Phase 3)
 * @returns Standard ChangeRequest structure
 */
export function transformToolInput(
  entity: EntityType,
  operation: OperationType,
  toolInput: Record<string, unknown>,
  currentData: Record<string, unknown> | null = null
): Omit<ChangeRequest, 'id' | 'createdAt' | 'executionOrder' | 'changesetId'> {
  // 1. Extract entity ID based on operation
  const entityId = extractEntityId(entity, operation, toolInput);

  // 2. Build proposed data (exclude ID fields and metadata)
  const proposedData = buildProposedData(entity, operation, toolInput);

  // 3. Return standard ChangeRequest structure
  // Note: id, createdAt, executionOrder will be added by ChangeSetContext
  return {
    operationType: operation,
    entityType: entity,
    entityId,
    currentData,
    proposedData,
  };
}

// ============================================================================
// Buffer Key Generation
// ============================================================================

/**
 * Generate keyed buffer key for a change request
 *
 * Format: "entityType:entityId"
 * For creates with no ID: "entityType:temp-{uuid}"
 *
 * @param entity - The entity type
 * @param entityId - The entity ID (or null for creates)
 * @returns Buffer key for the keyed buffer Map
 */
export function makeBufferKey(entity: EntityType, entityId: string | null): string {
  if (!entityId) {
    // Generate temp key for creates
    return `${entity}:temp-${ulid()}`;
  }

  return `${entity}:${entityId}`;
}

/**
 * Generate buffer key from a ChangeRequest
 */
export function makeBufferKeyFromRequest(request: ChangeRequest): string {
  return makeBufferKey(request.entityType, request.entityId);
}

// ============================================================================
// Current Data Fetching
// ============================================================================

/**
 * Fetch current data from database for updates/deletes
 * This provides the "before" snapshot for the ChangeRequest
 */
async function fetchCurrentData(
  db: any,
  entityType: EntityType,
  entityId: string
): Promise<Record<string, unknown> | null> {
  try {
    // Import repositories dynamically
    const { TransactionRepository } = await import('@/lib/data/repositories/TransactionRepository');
    const { CategoryRepository } = await import('@/lib/data/repositories/CategoryRepository');
    // Note: Add more repositories as needed

    switch (entityType) {
      case 'transaction': {
        const repo = new TransactionRepository(db);
        const transaction = await repo.getById(entityId);
        // Convert to plain object for ChangeRequest
        return transaction ? { ...transaction } as Record<string, unknown> : null;
      }
      case 'category': {
        const repo = new CategoryRepository(db);
        const category = await repo.getById(entityId);
        // Convert to plain object for ChangeRequest
        return category ? { ...category } as Record<string, unknown> : null;
      }
      // Add more entity types as needed
      default:
        console.warn(`fetchCurrentData not implemented for entity type: ${entityType}`);
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch current data for ${entityType}:${entityId}`, error);
    return null;
  }
}

// ============================================================================
// Buffer Management
// ============================================================================

/**
 * Helper to add a change request to the buffer using transformation layer
 */
async function addToBuffer(
  changeSetActions: {
    addChangeRequest: (key: string, request: any) => void;
    removeChangeRequest: (key: string) => void;
    getBufferAsArray?: () => any[];
  },
  entityType: EntityType,
  operation: OperationType,
  enrichedToolInput: Record<string, unknown>,
  db: any
) {
  // Handle DISCARD action
  if (enrichedToolInput.action === 'DISCARD') {
    const entityId = enrichedToolInput.entityId || enrichedToolInput.transactionId || enrichedToolInput.categoryId;
    if (entityId) {
      const key = makeBufferKey(entityType, String(entityId));
      changeSetActions.removeChangeRequest(key);
      console.log('🗑️ [ChangeRequest] DISCARD', { entityType, entityId, key });
    }
    return;
  }

  // Fetch current data for updates/deletes
  let currentData: Record<string, unknown> | null = null;
  if (operation !== 'create') {
    const entityId = extractEntityId(entityType, operation, enrichedToolInput);
    if (entityId) {
      currentData = await fetchCurrentData(db, entityType, entityId);
    }
  }

  // Use transformation layer to create standard ChangeRequest structure
  // transformToolInput will use extractEntityId and buildProposedData
  const changeRequest = transformToolInput(
    entityType,
    operation,
    enrichedToolInput,
    currentData
  );

  // For buffer key: use entityId (for updates/deletes) or proposedData.id (for creates)
  const keyId = changeRequest.entityId || (changeRequest.proposedData as any)?.id;
  const key = makeBufferKey(entityType, keyId);

  changeSetActions.addChangeRequest(key, changeRequest);

  // Get buffer state after adding
  const bufferSize = changeSetActions.getBufferAsArray?.().length ?? '?';

  // Log the final prepared ChangeRequest
  console.log('✅ [ChangeRequest] Added to buffer', {
    operation: changeRequest.operationType,
    entity: changeRequest.entityType,
    entityId: changeRequest.entityId,
    key,
    proposedData: changeRequest.proposedData,
    currentData: changeRequest.currentData,
    bufferSize: `${bufferSize} total in changeset`,
  });
}

// ============================================================================
// Tool Handler (Central Router)
// ============================================================================

/**
 * Tool handler result - either success/error or PAUSE for coordination tools
 */
export type ToolHandlerResult =
  | { type: 'success'; output: unknown }
  | { type: 'error'; errorText: string }
  | { type: 'pause' }; // For confirmChangeSet - widget will resume later

/**
 * Central tool handler that routes tool calls to appropriate executors
 *
 * Pattern from architecture doc:
 * - ChangeRequest tools: parse name, route to executor, return immediate result
 * - Coordination tools: confirmChangeSet returns PAUSE, reset returns immediate
 * - Read tools: execute immediately
 *
 * @param toolName - The tool name from AI
 * @param args - Tool arguments
 * @param context - Execution context (db, account, changeset actions)
 */
export async function handleToolCall(
  toolName: string,
  args: unknown,
  context: {
    db: any;
    accountId: string;
    changeSetActions: {
      addChangeRequest: (key: string, request: any) => void;
      removeChangeRequest: (key: string) => void;
      transitionToPendingApproval: (metadata: any, db: any) => Promise<string>;
      clearBuffer: () => void;
      getBufferAsArray: () => any[];
    };
  }
): Promise<ToolHandlerResult> {
  // Import executors dynamically to avoid circular dependencies
  const executors = await import('./tools');

  try {
    // Check if it's a ChangeRequest tool
    if (toolName.endsWith('ChangeRequest')) {
      const { entity, operation } = parseChangeRequestToolName(toolName);

      // Route to appropriate executor based on entity and operation
      let result: any;

      if (entity === 'transaction' && operation === 'create') {
        result = await executors.executeCreateTransactionChangeRequest(
          context.db,
          context.accountId,
          args as any
        );
      } else if (entity === 'transaction' && operation === 'update') {
        result = await executors.executeUpdateTransactionChangeRequest(
          context.db,
          context.accountId,
          args as any
        );
      } else if (entity === 'transaction' && operation === 'delete') {
        result = await executors.executeDeleteTransactionChangeRequest(
          context.db,
          context.accountId,
          args as any
        );
      } else if (entity === 'category' && operation === 'create') {
        result = await executors.executeCreateCategoryChangeRequest(
          context.db,
          context.accountId,
          args as any
        );
      } else {
        return { type: 'error', errorText: `Unsupported changeset tool: ${toolName}` };
      }

      // Handle executor result
      if (!result.success) {
        return { type: 'error', errorText: result.error || JSON.stringify(result.errors) || 'Execution failed' };
      }

      // Add to buffer using transformation layer (fetches currentData for updates/deletes)
      await addToBuffer(
        context.changeSetActions,
        entity,
        operation,
        result.enrichedToolInput,
        context.db
      );

      return { type: 'success', output: result };
    }

    // Read tools
    if (toolName === 'getCategories') {
      const result = await executors.executeGetCategories(context.db, context.accountId);
      return { type: 'success', output: result };
    }

    if (toolName === 'getMembers') {
      const result = await executors.executeGetMembers(context.db, context.accountId);
      return { type: 'success', output: result };
    }

    if (toolName === 'searchTransactions') {
      const result = await executors.executeSearchTransactions(
        context.db,
        context.accountId,
        args as any
      );
      return { type: 'success', output: result };
    }

    // Coordination tools
    if (toolName === 'confirmChangeSet') {
      // Log the changeset being confirmed
      const changeset = context.changeSetActions.getBufferAsArray();
      console.log('📋 [ConfirmChangeSet] Agent confirming changeset:', {
        totalChanges: changeset.length,
        changes: changeset.map(change => ({
          operation: change.operationType,
          entity: change.entityType,
          entityId: change.entityId,
          proposedData: change.proposedData,
          currentData: change.currentData,
        })),
      });

      const result = await executors.executeConfirmChangeSet(
        context.changeSetActions,
        args as any,
        undefined, // toolCallId will be set by caller
        context.db
      );

      if (!result.success) {
        return { type: 'error', errorText: result.error || 'Failed to confirm changeset' };
      }

      // Return PAUSE - don't call addToolOutput yet
      // Widget will call it after user approval/rejection
      return { type: 'pause' };
    }

    if (toolName === 'resetChangeSet') {
      const result = await executors.executeResetChangeSet(context.changeSetActions);
      return { type: 'success', output: result };
    }

    // Unknown tool
    return { type: 'error', errorText: `Unknown tool: ${toolName}` };

  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      type: 'error',
      errorText: error instanceof Error ? error.message : 'Tool execution failed'
    };
  }
}
