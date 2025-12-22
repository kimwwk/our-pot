# ChangeSet Pattern: Transformation Layer

**Purpose**: Document the transformation layer that converts entity-specific tool inputs into standard ChangeRequest format
**Scope**: Domain-agnostic - patterns applicable to any entity types
**Principle**: Tools are entity-specific and operation-specific; transformation is mechanical

---

## Two-Layer Design

The ChangeSet pattern has two distinct layers:

| Layer | Purpose | What It Contains |
|-------|---------|------------------|
| **Tool Schema** | AI-facing interface | Entity-specific parameters, business logic fields |
| **ChangeRequest** | Internal data format | Standard format for buffer/execution |

**Key Points:**

1. **Tool names follow convention** - `{operation}{EntityType}ChangeRequest`
2. **Operations are consistent** - AI reads current data first, then proposes appropriate operation (create/update/delete)
3. **Transformation is mechanical** - Maps tool parameters to ChangeRequest fields, no operation type conversion

**Example:**
```
AI calls: updateOrderChangeRequest({ orderId: "123", status: "shipped" })
                    ↓
Transformation: Extract fields, build standard format
                    ↓
ChangeRequest: {
  operationType: 'update',
  entityType: 'order',
  entityId: '123',
  proposedData: { status: "shipped" }
}
```

The transformation layer is purely mechanical - it reformats tool input into ChangeRequest structure without changing semantics.

---

## Core Principle

> **Tools should be simple and focused. Each tool = one entity type + one operation.**

The AI calls entity-specific tools with natural parameters. A **transformation layer** converts these into the standard `ChangeRequest` format for the keyed buffer.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI TOOL CALLS                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ create[Entity]  │  │ update[Entity]  │  │ delete[Entity]  │     │
│  │ ChangeRequest   │  │ ChangeRequest   │  │ ChangeRequest   │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
└───────────┼─────────────────────┼─────────────────────┼─────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TRANSFORMATION LAYER                             │
│                                                                      │
│  • Parse tool name to extract entity type and operation              │
│  • Extract entity ID from tool-specific field                        │
│  • Build proposedData from tool parameters                           │
│  • Fetch currentData for updates/deletes                             │
│  • Map to standard ChangeRequest format                              │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     STANDARD ChangeRequest                           │
│  {                                                                   │
│    id: string,                                                       │
│    operationType: "create" | "update" | "delete",                    │
│    entityType: string,                                               │
│    entityId: string | null,                                          │
│    currentData: object | null,                                       │
│    proposedData: object | null,                                      │
│    executionOrder: number                                            │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Anti-Pattern: Combined Tools ❌

```typescript
// ❌ WRONG: One tool with action parameter
{
  name: "modifyEntity",
  parameters: {
    action: "create" | "update" | "delete",  // Complex conditional logic
    entityId: string,      // Required for some actions
    // ... many conditional fields
  }
}
```

**Problems:**
- Complex schema with conditional fields
- AI must understand which fields apply to which action
- Harder to validate
- Doesn't align with ChangeRequest structure

---

## Correct Pattern: Entity + Operation Tools ✅

```typescript
// ✅ CORRECT: Separate tools per operation
{
  name: "createOrderChangeRequest",
  parameters: {
    customerId: string,
    items: ItemData[],
    reasoning: string
  }
}

{
  name: "updateOrderChangeRequest",
  parameters: {
    orderId: string,        // Which order to update
    status: string,
    reasoning: string
  }
}

{
  name: "deleteOrderChangeRequest",
  parameters: {
    orderId: string,        // Which order to remove
    reasoning: string
  }
}
```

**Benefits:**
- Simple, focused schemas
- Clear required fields for each operation
- Easy for AI to use correctly
- Direct mapping to ChangeRequest

---

## Tool Naming Convention

```
{operation}{EntityType}ChangeRequest
```

| Operation | Entity | Tool Name |
|-----------|--------|-----------|
| create | Order | `createOrderChangeRequest` |
| update | Order | `updateOrderChangeRequest` |
| delete | Order | `deleteOrderChangeRequest` |
| create | Item | `createItemChangeRequest` |
| update | Item | `updateItemChangeRequest` |
| delete | Item | `deleteItemChangeRequest` |

**Supported Operations:**
- `create` - Add new entity
- `update` - Modify existing entity
- `delete` - Remove entity

---

## Transformation Functions

### Generic Transformer

```typescript
interface ToolInput {
  [key: string]: unknown
  reasoning?: string
}

function transformToolInput(
  entityType: string,
  operationType: OperationType,
  toolInput: ToolInput
): ChangeRequest {

  // 1. Extract entity ID based on operation
  const entityId = extractEntityId(entityType, operationType, toolInput)

  // 2. Fetch current data for updates/deletes
  const currentData = operationType !== 'create'
    ? await fetchCurrentData(entityType, entityId)
    : null

  // 3. Build proposed data (exclude ID fields)
  const proposedData = operationType !== 'delete'
    ? buildProposedData(entityType, toolInput)
    : null

  // 4. Return standard format
  return {
    id: generateId(),
    operationType,
    entityType,
    entityId,
    currentData,
    proposedData,
    executionOrder: getNextOrder(),
    aiReasoning: toolInput.reasoning,
    createdAt: new Date()
  }
}
```

### Entity ID Extraction

```typescript
// Domain implementations define their own ID field mappings
// Example configuration:
const ENTITY_ID_FIELDS: Record<string, string> = {
  'order': 'orderId',
  'item': 'itemId',
  'customer': 'customerId',
  // ... domain-specific mappings
}

function extractEntityId(
  entityType: string,
  operationType: OperationType,
  toolInput: ToolInput
): string | null {

  if (operationType === 'create') {
    return null  // Will be assigned after creation
  }

  const idField = ENTITY_ID_FIELDS[entityType]
  const entityId = toolInput[idField]

  if (!entityId) {
    throw new Error(`Missing ${idField} for ${operationType} operation`)
  }

  return String(entityId)
}
```

### Build Proposed Data

```typescript
function buildProposedData(
  entityType: string,
  toolInput: ToolInput
): Record<string, unknown> | null {

  // Clone and remove metadata fields
  const { reasoning, ...data } = toolInput

  // Remove entity-specific ID fields
  const idField = ENTITY_ID_FIELDS[entityType]
  delete data[idField]

  return data
}
```

---

## Tool Handler with Transformation

```typescript
function handleToolCall(
  toolName: string,
  args: unknown
): ToolResult | 'PAUSE' {

  // Parse tool name: {operation}{Entity}ChangeRequest
  const { operation, entity } = parseChangeRequestToolName(toolName)

  // Transform to ChangeRequest
  const changeRequest = transformToolInput(entity, operation, args)

  // Upsert to keyed buffer
  buffer.upsert(changeRequest)

  return { success: true, changeId: changeRequest.id }
}

function parseChangeRequestToolName(toolName: string): { operation: string, entity: string } {
  // createOrderChangeRequest → { operation: 'create', entity: 'Order' }
  // updateItemChangeRequest → { operation: 'update', entity: 'Item' }
  const match = toolName.match(/^(create|update|delete)(\w+)ChangeRequest$/)
  if (!match) throw new Error(`Invalid tool name: ${toolName}`)
  return { operation: match[1], entity: match[2] }
}
```

---

## Domain Implementation

Each domain defines:

1. **Entity types** - What entities can be modified
2. **ID field mappings** - How to extract entity IDs from tool input
3. **Tool schemas** - Entity-specific parameter definitions

These are documented in domain-specific files (e.g., `session-tool-definitions.md`).

---

## Summary

| Layer | Responsibility |
|-------|----------------|
| **AI Tools** | Simple, focused schemas per entity + operation |
| **Transformation Layer** | Convert tool input → standard ChangeRequest |
| **Keyed Buffer** | Store ChangeRequests with upsert semantics |
| **Execution Layer** | Apply ChangeRequests to database |

**Key Principles:**
1. One tool = one entity + one operation
2. Tool schemas are simple and focused
3. Transformation is mechanical (no business logic conversion)
4. ChangeRequest format is universal

---

## References

- Architecture: `20251221-changeset-architecture.md`
- Client Tools: `20251221-changeset-client-tools.md`
- Domain-specific tool definitions: See feature-specific documentation
