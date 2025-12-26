/**
 * Standard ChangeRequest types following the ChangeSet pattern architecture
 *
 * Reference: doc/references/20251221-concept-changeset-*.md
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Standard ChangeRequest format - the intermediate representation
 * between tool input and database operations
 */
export interface ChangeRequest {
  id: string;
  changesetId?: string; // Parent changeset ID (set when transitioning to pending_approval)
  operationType: OperationType;
  entityType: EntityType;
  entityId: string | null; // null for creates, actual ID for updates/deletes
  currentData: Record<string, unknown> | null; // Snapshot of current state (for updates/deletes, used for optimistic concurrency)
  proposedData: Record<string, unknown> | null; // Proposed changes (for creates/updates)
  executionOrder: number; // Sequence number for deterministic execution
  createdAt: string;
}

/**
 * Operation types supported by the ChangeSet pattern
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * Entity types in our domain
 */
export type EntityType = 'transaction' | 'category' | 'account' | 'member';

// ============================================================================
// Changeset Status
// ============================================================================

/**
 * Changeset lifecycle states
 */
export type ChangeSetStatus =
  | 'idle' // No active changeset
  | 'building' // AI accumulating changes in keyed buffer
  | 'pending_approval' // Awaiting user decision (AI stream paused)
  | 'executing' // Operations being applied atomically
  | 'approved' // Successfully applied
  | 'execution_failed' // Rolled back due to error
  | 'rejected'; // User rejected completely

// ============================================================================
// Error Types (will be used in Phase 4)
// ============================================================================

/**
 * Error classification for AI recovery strategies
 */
export type ErrorType =
  | 'STALE_STATE' // Optimistic lock failure
  | 'NOT_FOUND' // Entity deleted by another user
  | 'CONSTRAINT' // FK violation, unique constraint
  | 'VALIDATION' // Business rule violation
  | 'TRANSIENT' // Network timeout, DB locked
  | 'CRITICAL'; // Internal server error

/**
 * Structured error response for execution failures
 */
export interface ExecutionError {
  type: ErrorType;
  code?: string; // Database error code
  message: string; // Human-readable message
  failedRequestId?: string; // Which ChangeRequest failed
  details?: Record<string, unknown>; // Additional context for AI
}

// ============================================================================
// Tool Input Types
// ============================================================================

/**
 * Base tool input structure - all changeset tools extend this
 */
export interface BaseToolInput {
  reasoning?: string; // AI's explanation for the change
  action?: 'UPSERT' | 'DISCARD'; // UPSERT = add/update, DISCARD = remove from buffer
}

/**
 * Tool input for transaction create
 */
export interface CreateTransactionToolInput extends BaseToolInput {
  entityId?: string; // Optional - for modifying previous proposal in same changeset
  type: 'EXPENSE' | 'DEPOSIT';
  amount: number; // Decimal format (e.g., 42.50)
  merchant?: string;
  description: string;
  categoryId?: string;
  memberId?: string;
  date?: string; // ISO YYYY-MM-DD
}

/**
 * Tool input for transaction update
 */
export interface UpdateTransactionToolInput extends BaseToolInput {
  transactionId: string;
  amount?: number;
  merchant?: string;
  description?: string;
  categoryId?: string;
  memberId?: string;
  date?: string;
}

/**
 * Tool input for transaction delete
 */
export interface DeleteTransactionToolInput extends BaseToolInput {
  transactionId: string;
}

/**
 * Tool input for category create
 */
export interface CreateCategoryToolInput extends BaseToolInput {
  entityId?: string;
  name: string;
  icon?: string;
  color?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Entity ID field names for each entity type
 */
export const ENTITY_ID_FIELDS: Record<EntityType, string> = {
  transaction: 'transactionId',
  category: 'categoryId',
  account: 'accountId',
  member: 'memberId',
};

/**
 * Metadata for a changeset
 */
export interface ChangeSetMetadata {
  title: string;
  description?: string;
  toolCallId?: string; // For stream synchronization
}
