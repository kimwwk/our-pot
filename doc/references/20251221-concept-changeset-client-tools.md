# ChangeSet Pattern: Client-Side Tool Execution

**Purpose**: Document patterns for handling tools on client vs server
**Scope**: Domain-agnostic - applicable to any ChangeSet implementation
**Reference**: Based on proven patterns from production implementations

---

## 1. Tool Execution Location

### 1.1 Server-Side Tools

Tools with `execute` function run on the server via AI SDK.

```typescript
// Server-side tool - has execute function
export const getAccountsTool = tool({
  description: "Retrieve all accounts",
  inputSchema: z.object({
    limit: z.number().optional(),
  }),
  execute: async ({ limit }) => {
    // Runs on server
    return await getAccounts({ limit })
  },
})
```

**Use for:**
- Read operations (fetching data)
- Operations that don't need user approval
- Operations that can complete immediately

### 1.2 Client-Side Tools

Tools WITHOUT `execute` function are handled by client via `onToolCall`.

```typescript
// Client-side tool - NO execute function
export const createTransactionChangeRequestTool = tool({
  description: "Add a transaction change request to the changeset",
  inputSchema: z.object({
    amount: z.number(),
    description: z.string(),
    reasoning: z.string(),
  }),
  // NO execute function - handled by client
})
```

**Use for:**
- Proposal tools (add to changeset buffer)
- Coordination tools (confirm, reset)
- Any tool that needs client-side state management

---

## 2. Client Tool Handler Pattern

### 2.1 onToolCall Handler

```typescript
const { messages, addToolOutput } = useChat({
  onToolCall: async ({ toolCall }) => {
    const toolName = toolCall.toolName

    // Define which tools are client-side
    const clientTools = [
      "createTransactionChangeRequest",
      "updateTransactionChangeRequest",
      "deleteTransactionChangeRequest",
      "confirmChangeSet",
      "resetChangeSet",
    ]

    // Only handle client-side tools
    // For server-side tools, return to let SDK handle them
    if (!clientTools.includes(toolName)) {
      return
    }

    // Handle based on tool type
    if (toolName.endsWith("ChangeRequest")) {
      await handleChangeRequestTool(toolCall, addToolOutput)
    }

    if (toolName === "confirmChangeSet") {
      await handleConfirmTool(toolCall, addToolOutput)
    }

    if (toolName === "resetChangeSet") {
      await handleResetTool(toolCall, addToolOutput)
    }
  },
})
```

### 2.2 Change Request Handler

```typescript
async function handleChangeRequestTool(
  toolCall: ToolCall,
  addToolOutput: AddToolOutputFn
) {
  try {
    // 1. Parse tool name to extract entity and operation
    const { entity, operation } = parseChangeRequestToolName(toolCall.toolName)

    // 2. Transform tool input to ChangeRequest format
    const transformed = transformToolInput(entity, operation, toolCall.input)

    // 3. Fetch currentData for updates/deletes
    let currentData = null
    if (transformed.recordId) {
      currentData = await fetchCurrentData(entity, transformed.recordId)
    }

    // 4. Add to changeset context
    addChange({
      entity: transformed.entity,
      operation: transformed.operation,
      recordId: transformed.recordId,
      currentData,
      proposedData: transformed.proposedData,
    })

    // 5. Return success to AI
    addToolOutput({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      output: {
        success: true,
        message: `Change request added: ${operation} ${entity}`,
      },
    })
  } catch (error) {
    addToolOutput({
      tool: toolCall.toolName,
      toolCallId: toolCall.toolCallId,
      state: "output-error",
      errorText: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
```

---

## 3. Tool Name Parsing

### 3.1 parseChangeRequestToolName

Extract entity type and operation from standardized tool names.

```typescript
/**
 * Parse tool name to extract entity and operation
 * Example: "createTransactionChangeRequest" -> { entity: "transaction", operation: "create" }
 */
function parseChangeRequestToolName(toolName: string): {
  entity: EntityType
  operation: OperationType
} {
  // Tool name pattern: {operation}{Entity}ChangeRequest
  const match = toolName.match(
    /^(create|update|delete)([A-Z][a-zA-Z]+)ChangeRequest$/
  )

  if (!match) {
    throw new Error(`Invalid changeset tool name: ${toolName}`)
  }

  const [, operation, entityPascal] = match
  const entity = entityPascal.toLowerCase() as EntityType

  return {
    entity,
    operation: operation as OperationType,
  }
}
```

### 3.2 Why This Pattern?

| Benefit | Explanation |
|---------|-------------|
| **Single Source of Truth** | Tool name encodes the operation, no separate mapping needed |
| **Type Safety** | Pattern matching validates the tool name format |
| **Extensibility** | Add new entities without changing parser logic |
| **Consistency** | Enforces naming convention across all tools |

---

## 4. Fetching Current Data

### 4.1 fetchCurrentData Pattern

Before updates/deletes, fetch the current state for:
- Optimistic concurrency checking
- Showing "before vs after" in UI
- Rollback capability

```typescript
/**
 * Fetch current data from database for an entity
 */
async function fetchCurrentData(
  entity: EntityType,
  recordId: string
): Promise<Record<string, unknown> | null> {
  switch (entity) {
    case "transaction":
      return await getTransaction(recordId)
    case "account":
      return await getAccount(recordId)
    case "category":
      return await getCategory(recordId)
    default:
      throw new Error(`Unknown entity type: ${entity}`)
  }
}
```

### 4.2 When to Fetch

| Operation | Fetch Current Data? | Reason |
|-----------|---------------------|--------|
| `create` | No | No existing record |
| `update` | Yes | Need before/after comparison |
| `delete` | Yes | Need to show what's being deleted |

---

## 5. Confirm Tool: Pause-Resume Pattern

### 5.1 The Critical Pattern

`confirmChangeSet` is special - it pauses the AI stream until user decides.

```typescript
if (toolName === "confirmChangeSet") {
  try {
    // 1. Mark as pending approval in context FIRST
    confirmChangeSet(toolCall.toolCallId)

    // 2. Show approval widget immediately
    addWidget({
      id: toolCall.toolCallId,
      toolName: "confirmChangeSet",
      toolArgs: toolCall.input,
      data: null, // Widget gets data from Context
      autoFocus: true,
    })

    // 3. DO NOT call addToolOutput here!
    // Widget will call it after user approval/rejection

  } catch (error) {
    // Only call addToolOutput on error
    addToolOutput({
      tool: toolName,
      toolCallId: toolCall.toolCallId,
      state: "output-error",
      errorText: error.message,
    })
  }
}
```

### 5.2 Widget Calls addToolOutput

The approval widget (not the handler) calls `addToolOutput` when user decides:

```typescript
// In ApprovalWidget.tsx
const handleApprove = async () => {
  const result = await executeChangeSet()

  // NOW resume AI stream
  addToolOutput({
    tool: "confirmChangeSet",
    toolCallId: toolCallId,
    output: {
      status: "approved",
      executedCount: result.count,
    },
  })
}

const handleReject = (feedback?: string) => {
  addToolOutput({
    tool: "confirmChangeSet",
    toolCallId: toolCallId,
    output: {
      status: feedback ? "rejected_with_feedback" : "rejected",
      feedback,
    },
  })
}
```

---

## 6. Context Bridge Pattern

### 6.1 Passing addToolOutput to Context

The widget needs access to `addToolOutput`, but it's created in `useChat`.

```typescript
function PageContent() {
  const { setAddToolOutput } = useChangeSet()
  const { addToolOutput } = useChat({ ... })

  // Bridge: pass addToolOutput to context
  useEffect(() => {
    setAddToolOutput(() => addToolOutput)
  }, [addToolOutput, setAddToolOutput])

  // ...
}
```

### 6.2 Context Structure

```typescript
interface ChangeSetContextValue {
  // State
  changes: ChangeRequest[]
  status: ChangeSetStatus

  // Actions
  addChange: (change: ChangeInput) => void
  confirmChangeSet: (toolCallId: string) => void
  clearChangeSet: () => void

  // Bridge
  addToolOutput: AddToolOutputFn | null
  setAddToolOutput: (fn: AddToolOutputFn) => void
}
```

---

## 7. File Organization (Single Responsibility)

### 7.1 Recommended Structure

```
lib/changeset/
├── types.ts              # Types: ChangeRequest, EntityType, OperationType
├── ChangeSetContext.tsx  # React context for changeset state
├── transformations.ts    # transformToolInput function
├── helpers.ts            # fetchCurrentData, other utilities
├── parser.ts             # parseChangeRequestToolName
└── execute.ts            # executeChangeSet (database operations)

components/changeset/
├── ApprovalWidget.tsx    # User approval UI
├── ChangePreview.tsx     # Preview individual changes
└── ChangeSummary.tsx     # Summary of all changes
```

### 7.2 Why Separate Files?

| File | Responsibility |
|------|----------------|
| `types.ts` | Pure types, no dependencies |
| `ChangeSetContext.tsx` | State management only |
| `transformations.ts` | Tool input → ChangeRequest conversion |
| `helpers.ts` | Data fetching utilities |
| `parser.ts` | Tool name parsing |
| `execute.ts` | Database transaction execution |

---

## 8. Error Handling

### 8.1 Tool Error Response

```typescript
addToolOutput({
  tool: toolName,
  toolCallId: toolCall.toolCallId,
  state: "output-error",
  errorText: error instanceof Error ? error.message : "Unknown error",
})
```

### 8.2 Error Types

| Error | Handling |
|-------|----------|
| Invalid tool name | Return error, AI can retry with correct name |
| Fetch failed | Return error, AI can retry or skip |
| Validation failed | Return error with details, AI can correct |
| Execution failed | Return error, transition to recovery state |

---

## References

- Architecture: `20251221-changeset-architecture.md`
- Transformation Layer: `20251221-changeset-transformation-layer.md`
- Principles: `20251221-changeset-principles.md`
