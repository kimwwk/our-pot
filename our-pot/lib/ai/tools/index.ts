/**
 * Client-Side Tools Index
 *
 * This exports tool schemas (for AI) and executors (for client)
 * separately to support client-side tool execution pattern.
 */

// Tool executors (called on client when AI requests tools)
export {
  // Read tools
  executeGetCategories,
  executeGetMembers,
  executeSearchTransactions,

  // Proposal tools
  executeCreateTransactionChangeRequest,
  executeUpdateTransactionChangeRequest,
  executeDeleteTransactionChangeRequest,
  executeCreateCategoryChangeRequest,

  // Confirmation tools
  executeConfirmChangeSet,
  executeResetChangeSet,

  // Helpers
  getKittyMemberId,

  // Types
  type ExecutorResult,
  type ChangeSetConfirmationActions,
} from "./tool-executors";
