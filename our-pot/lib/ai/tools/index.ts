/**
 * Client-Side Tools Index
 *
 * This exports tool schemas (for AI) and executors (for client)
 * separately to support client-side tool execution pattern.
 */

// Tool schemas (sent to AI)
export { allTools, type ToolName } from "./tool-schemas";

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
  type ChangeSetActions,
  type ChangeSetConfirmationActions,
} from "./tool-executors";

/**
 * Usage Pattern:
 *
 * 1. In your chat component, import allTools and pass to useChat:
 *    ```tsx
 *    const { messages, append } = useChat({
 *      api: '/api/chat',
 *      tools: allTools,
 *      // ... other options
 *    });
 *    ```
 *
 * 2. When AI makes a tool call, intercept in onToolCall callback:
 *    ```tsx
 *    const { messages, append } = useChat({
 *      api: '/api/chat',
 *      tools: allTools,
 *      onToolCall: async ({ toolCall }) => {
 *        // Execute tool on client
 *        const result = await executeToolOnClient(toolCall);
 *        return result;
 *      }
 *    });
 *    ```
 *
 * 3. For proposal tools, pass changeSetActions from context:
 *    ```tsx
 *    const { addChangeRequest, removeChangeRequest } = useChangeSet();
 *
 *    const executeToolOnClient = async (toolCall) => {
 *      switch (toolCall.toolName) {
 *        case 'createTransactionChangeRequest':
 *          return executeCreateTransactionChangeRequest(
 *            db,
 *            accountId,
 *            { addChangeRequest, removeChangeRequest },
 *            toolCall.args
 *          );
 *        // ... other cases
 *      }
 *    };
 *    ```
 */
