# Client-Side Tools Implementation Guide

This guide explains how to use the client-side tool pattern with Vercel AI SDK.

## Architecture

**Key Principle:** Tool execution happens on the client, NOT on the server.

```
1. Tool Schemas → Sent to AI (defines what tools are available)
2. AI Response → Contains tool calls with arguments
3. Client Intercept → Catches tool calls before sending to server
4. Client Execute → Runs tool logic locally
5. Add Tool Result → Feeds result back to AI conversation
```

## File Structure

```
lib/ai/tools/
├── tool-schemas.ts       # Tool definitions (schemas only, no execute)
├── tool-executors.ts     # Execution logic (called by client)
├── index.ts              # Exports and usage guide
└── CLIENT-SIDE-TOOLS-GUIDE.md  # This file
```

## Step-by-Step Implementation

### 1. Define Tool Schemas (tool-schemas.ts)

```typescript
export const createTransactionChangeRequestTool = {
  description: "Propose creating a new transaction...",
  parameters: z.object({
    amount: z.number().positive(),
    description: z.string(),
    // ... other params
  }),
  // NO execute function here!
};
```

### 2. Implement Tool Executors (tool-executors.ts)

```typescript
export async function executeCreateTransactionChangeRequest(
  db: any,
  accountId: string,
  changeSetActions: ChangeSetActions,
  params: { amount: number; description: string; /* ... */ }
) {
  // Validation
  const validation = validateTransactionProposal(params);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  // Add to keyed buffer (NOT to database)
  const entityId = ulid();
  const key = `transaction:${entityId}`;
  changeSetActions.addChangeRequest(key, {
    operationType: "create",
    entityType: "transaction",
    proposedData: JSON.stringify(proposedData),
  });

  return {
    success: true,
    message: "Added to changeset",
    entityId,
  };
}
```

### 3. Wire Up in Chat Component

```typescript
"use client";

import { useChat } from "ai/react";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { allTools } from "@/lib/ai/tools";
import {
  executeGetCategories,
  executeGetMembers,
  executeSearchTransactions,
  executeCreateTransactionChangeRequest,
  executeConfirmChangeSet,
  // ... other executors
} from "@/lib/ai/tools";

export function AgentChatPanel() {
  const { db } = useSQLite();
  const { account } = useAccount();
  const changeSetContext = useChangeSet();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
  } = useChat({
    api: "/api/chat", // Simple proxy endpoint
    tools: allTools,
    async onToolCall({ toolCall }) {
      // Execute tools on client
      const { toolName, args } = toolCall;

      // Read tools
      if (toolName === "getCategories") {
        return await executeGetCategories(db, account.id);
      }
      if (toolName === "getMembers") {
        return await executeGetMembers(db, account.id);
      }
      if (toolName === "searchTransactions") {
        return await executeSearchTransactions(db, account.id, args);
      }

      // Proposal tools (use changeSetContext)
      if (toolName === "createTransactionChangeRequest") {
        return await executeCreateTransactionChangeRequest(
          db,
          account.id,
          {
            addChangeRequest: changeSetContext.addChangeRequest,
            removeChangeRequest: changeSetContext.removeChangeRequest,
          },
          args
        );
      }

      // Confirmation tools
      if (toolName === "confirmChangeSet") {
        return await executeConfirmChangeSet(
          {
            transitionToPendingApproval: changeSetContext.transitionToPendingApproval,
            clearBuffer: changeSetContext.clearBuffer,
            getBufferAsArray: changeSetContext.getBufferAsArray,
          },
          args,
          toolCall.toolCallId
        );
      }

      // ... handle other tools

      return { error: `Unknown tool: ${toolName}` };
    },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask AI about expenses..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

### 4. Create Simple API Proxy (app/api/chat/route.ts)

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(req: Request) {
  const { messages, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4-turbo"),
    system: SYSTEM_PROMPT,
    messages,
    tools, // Tools schemas passed through
    // Note: tool execution happens on CLIENT, not here
  });

  return result.toDataStreamResponse();
}
```

## Key Differences from Server-Side Tools

| Aspect | Server-Side | Client-Side (Our Approach) |
|--------|------------|---------------------------|
| Tool definition | `tool({ execute: async () => {...} })` | `{ parameters: z.object({...}) }` |
| Execution location | Server API route | Client component |
| Database access | Direct via server | Via client context (SQLite) |
| State management | N/A | Via React Context (ChangeSetContext) |
| Stream pause | Not possible | Possible (deferred addToolResult) |

## Benefits of Client-Side Execution

1. **Local-first architecture**: No data sent to server
2. **Stream control**: Can pause AI stream during user review
3. **Direct state access**: Can modify React context directly
4. **No API roundtrips**: Faster tool execution
5. **Offline support**: Works with local SQLite

## Important: Pause-Resume Pattern for confirmChangeSet

When `confirmChangeSet` is called:

1. **DO NOT** return result immediately
2. Transition state to `pending_approval`
3. Show Review Widget
4. Wait for user decision
5. **THEN** add tool result to continue AI stream

```typescript
if (toolName === "confirmChangeSet") {
  const result = await executeConfirmChangeSet(/* ... */);

  // Transition state (triggers Review Widget)
  // AI stream is now paused

  // DON'T return result here!
  // Return a promise that resolves when user approves/rejects

  return new Promise((resolve) => {
    // Store resolve callback for later
    pendingConfirmationResolver.current = resolve;
  });
}

// Later, in Review Widget:
function handleApprove() {
  // Execute changeset
  executeChangeSet();

  // Resume AI stream
  if (pendingConfirmationResolver.current) {
    pendingConfirmationResolver.current({
      success: true,
      message: "Approved and executed",
    });
    pendingConfirmationResolver.current = null;
  }
}
```

## Testing Client-Side Tools

1. **Unit test executors**: Mock db, accountId, changeSetActions
2. **Integration test in component**: Use testing-library
3. **E2E test**: Full AI conversation flow

Example unit test:

```typescript
test("executeCreateTransactionChangeRequest adds to buffer", async () => {
  const mockAddChangeRequest = jest.fn();
  const mockDb = {};
  const accountId = "account-123";

  const result = await executeCreateTransactionChangeRequest(
    mockDb,
    accountId,
    { addChangeRequest: mockAddChangeRequest, removeChangeRequest: jest.fn() },
    {
      type: "EXPENSE",
      amount: 42.5,
      description: "Groceries",
    }
  );

  expect(result.success).toBe(true);
  expect(mockAddChangeRequest).toHaveBeenCalledWith(
    expect.stringContaining("transaction:"),
    expect.objectContaining({
      operationType: "create",
      entityType: "transaction",
    })
  );
});
```

---

## Summary

**Client-side tools = Schemas separate from execution**

- **Schemas**: Define what AI can call
- **Executors**: Implement the logic
- **Client**: Connects them with `onToolCall`
- **Result**: Local-first, pauseable, context-aware tools
