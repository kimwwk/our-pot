# ChangeSet Pattern: Core Principles

**Purpose**: Domain-agnostic principles for AI-human interaction management
**Source**: Consolidated from Product 1 (Concept) + Product 2 (Implementation)
**Applicable To**: Any AI system proposing consequential actions requiring human approval

---

## What Is The ChangeSet Pattern?

The ChangeSet Pattern is a **human-in-the-loop workflow** that separates AI's **proposal capabilities** from **execution authority**. The AI agent composes multiple related operations into a logical unit (changeset), but execution only occurs after explicit human approval.

**Core Metaphor**: AI is a *proposal engine*, not an *execution engine*.

---

## The Five Core Principles

### 1. Autonomy with Accountability

**Principle**: Give AI freedom to plan multi-step operations, but require human approval before execution.

**Why It Matters**:
- Enables sophisticated AI capabilities (multi-step reasoning, complex operations)
- Maintains human control over consequential actions
- Creates clear accountability trail

**Implementation Requirement**:
- AI has full access to *proposal* tools
- AI has zero access to *execution* directly
- Execution authority remains with humans

---

### 2. Transparency (Before/After Visibility)

**Principle**: Users must see complete context of what will happen before approving.

**Why It Matters**:
- Enables informed decision-making
- Catches AI mistakes before they affect data
- Builds user trust in the AI system

**Implementation Requirement**:
- Show current state (before values) for updates/deletes
- Show proposed state (after values) for creates/updates
- Display AI's reasoning for each change
- No hidden operations

---

### 3. Batching Over Incrementalism

**Principle**: Group related operations into logical units rather than requesting approval for each individually.

**Why It Matters**:
- Reduces approval fatigue
- Enables atomic logical operations
- Better user experience (fewer interruptions)
- Operations that belong together stay together

**Implementation Requirement**:
- Accumulation phase builds complete changeset before seeking approval
- Single approval action for entire batch
- All-or-nothing execution (atomic semantics)

---

### 4. Sequential Consistency

**Principle**: Operations must execute in specified order to maintain data integrity.

**Why It Matters**:
- Handles dependencies between operations (e.g., create parent before child)
- Predictable execution behavior
- Easier error recovery (know exactly where failure occurred)

**Implementation Requirement**:
- Each ChangeRequest has execution order
- Backend respects ordering during execution
- Stop-on-first-failure (no partial execution past error)

---

### 5. Stream Synchronization (Pause-Resume)

**Principle**: AI conversation and approval workflow must synchronize correctly.

**Why It Matters**:
- Natural conversation flow maintained
- AI can respond to approval results contextually
- No race conditions between AI and user

**Implementation Requirement**:
- AI stream *pauses* when approval is needed
- User reviews during pause (no time pressure)
- AI stream *resumes* after user decision
- Decision context flows back to AI

---

## The Key Innovation: Keyed Buffer Architecture

**Problem**: Array-based change accumulation leads to index management issues, duplicates, and correction complexity.

**Solution**: Use a **Key-Value Map** (not an array) to accumulate change requests.

**The Key**: Composite identifier = `EntityType + RecordID`
- Example: `"order:123"` or `"customer:456"`

**The Behavior (Last-Write-Wins / Upsert)**:
- When AI proposes an operation on an entity already in the buffer, the new proposal **overwrites** the previous one
- AI corrects errors by simply re-proposing with fixed values
- No index management needed
- Special `action: "DISCARD"` flag removes entries entirely

**Benefits**:
- **Idempotent**: AI can restate intent multiple times without creating duplicates
- **Zero Index Tracking**: AI doesn't manage array indices (eliminates hallucination errors)
- **Natural Corrections**: AI just re-calls tool with new values to fix mistakes

---

## When To Use This Pattern

**Use when**:
- AI agents propose consequential actions
- Actions may be complex or multi-step
- Users need transparency before commitment
- Safety is more important than speed
- Related operations benefit from batching
- Mistakes are costly to fix

**Don't use when**:
- Real-time systems requiring immediate action
- High-volume operations where approval becomes bottleneck
- Undo-able operations where retry is cheaper than approval
- Non-consequential actions (read-only, cosmetic changes)

---

## Trade-offs Accepted

| Trade-off | Justification |
|-----------|---------------|
| **Architectural Complexity** | Safety and UX benefits outweigh implementation cost |
| **Latency** | Human-in-the-loop inherently slower; acceptable for consequential operations |
| **All-or-Nothing Approval** | Simpler UX; partial approval adds significant complexity |
| **No Undo (in v1)** | Approval replaces undo; future enhancement possible |

---

## Benefits Realized

- **User Safety**: No accidental data modification, no approving known bad states
- **AI Capability**: Multi-step reasoning without risk
- **Natural Corrections**: AI restates intent (no index tracking needed)
- **Token Efficiency**: Only re-outputs corrected values, not entire changeset
- **Transparency**: Complete before/after visibility
- **Audit Trail**: Clean history of approved changesets
- **Idempotent Operations**: AI can safely re-propose without duplicates
- **Conversational UX**: Feels like iterative refinement, not robotic reset

---

## References

- Original concept analysis: `20251217-product1-Concept-ChangeSet pattern.md`
- Detailed implementation: `20251218-product2-SAD-v1-4-ChangeSet-Domain-Logic.md`
