# Feature 6: AI ChangeSet System - Quick Start

**Status:** ✅ Fully Implemented and Ready to Use!

---

## 🚀 Getting Started

### Prerequisites

1. OpenAI API key (get from https://platform.openai.com/api-keys)
2. Node.js 18+ installed
3. Project dependencies installed (`npm install`)

### Setup (2 minutes)

```bash
# 1. Copy environment template
cp .env.local.example .env.local

# 2. Edit .env.local and add your OpenAI API key
# NEXT_PUBLIC_OPENAI_API_KEY=sk-...your-key-here

# 3. Start the development server
npm run dev

# 4. Open http://localhost:3000
```

---

## 🎯 How to Use

### Basic Workflow

1. **Navigate to Agent Tab**
   - Click the "Agent" tab in the bottom navigation

2. **Chat with AI**
   - Type: "I paid £42 for groceries at Tesco"
   - AI will analyze and propose a transaction

3. **Review Proposal**
   - Review Widget appears showing the proposed change
   - See transaction details (amount, merchant, category)

4. **Approve or Reject**
   - **Approve:** Transaction created immediately
   - **Request Changes:** AI will revise (iterative refinement)
   - **Reject:** Discard completely

### Example Conversations

**Create Transaction:**
```
User: I just spent £42.50 on groceries at Tesco
AI: I'll create a groceries expense for £42.50
→ Shows Review Widget
→ User approves
→ Transaction created
```

**Multiple Transactions:**
```
User: I paid £15 for transport and £8 for coffee
AI: I'll create two transactions
→ Shows Review Widget with both
→ User approves
→ Both created atomically
```

**Iterative Correction:**
```
User: Add £42 for groceries
AI: I'll create a groceries expense
→ Shows Review Widget
→ User: "Request Changes: Make it £45 instead"
AI: Updated to £45
→ Shows corrected Review Widget
→ User approves
→ Transaction created with £45
```

**Create Category:**
```
User: Can you create a "Pet Supplies" category?
AI: I'll create the Pet Supplies category
→ Shows Review Widget
→ User approves
→ Category created
```

---

## 🎨 Features Implemented

### ✅ Client-Side Tool Execution
- All tool execution happens on the client
- No data sent to server
- Direct access to local SQLite database
- Fast and private

### ✅ Keyed Buffer (Upsert Semantics)
- AI can correct errors by re-proposing
- No duplicate proposals
- No array index management needed
- Natural correction workflow

### ✅ Stream Pause-Resume
- AI stream pauses when proposal ready
- User reviews at their own pace
- Stream resumes after user decision
- Maintains conversation context

### ✅ Three Approval Modes
1. **Approve** - Execute changeset immediately
2. **Request Changes** - AI corrects and re-submits
3. **Reject Completely** - Discard and start fresh

### ✅ Amount Conversion
- User & AI speak in decimals (£42.50)
- Database stores in cents (4250)
- Display converts back to currency (£42.50)
- Seamless end-to-end

### ✅ Atomic Execution
- All changes execute in single transaction
- All-or-nothing (ACID)
- Database rollback on any error
- Data integrity guaranteed

---

## 🏗️ Architecture

### Components

```
AgentChatPanel
├── Messages (chat history)
├── ReviewWidget (when status=pending_approval)
│   ├── Change requests list
│   ├── Approve button
│   ├── Request Changes button
│   └── Reject button
└── AgentInput (text input)
```

### Contexts

```
App Layout
├── SQLiteProvider (database)
├── AccountProvider (current account)
└── ChangeSetProvider (AI state)
    ├── status: idle | building | pending_approval | approved | rejected
    ├── keyedBuffer: Map<string, ChangeRequest>
    └── metadata: { title, description }
```

### Data Flow

```
1. User message → AI (OpenAI)
2. AI calls tools (client-side execution)
3. Tools modify keyedBuffer (proposals accumulate)
4. AI calls confirmChangeSet
5. State → pending_approval
6. ReviewWidget appears (stream PAUSED)
7. User approves
8. Execute changeset (atomic DB transaction)
9. State → approved
10. Stream RESUMES
11. AI confirms success
```

---

## 🔧 Technical Details

### Tool Categories

**Read Tools (Immediate Execution):**
- `getCategories` - Fetch available categories
- `getMembers` - Fetch members who can pay
- `searchTransactions` - Find existing transactions

**Proposal Tools (Buffered):**
- `createTransactionChangeRequest` - Propose new transaction
- `updateTransactionChangeRequest` - Propose transaction update
- `deleteTransactionChangeRequest` - Propose transaction deletion
- `createCategoryChangeRequest` - Propose new category

**Confirmation Tools:**
- `confirmChangeSet` - Submit for review (PAUSES STREAM)
- `resetChangeSet` - Clear buffer (rare)

### Keyed Buffer Example

```typescript
// AI proposes transaction
keyedBuffer = {
  "transaction:01ABC": { amount: 4200, description: "Groceries" }
}

// User: "Change amount to £45"
// AI re-proposes with same key (UPSERT)
keyedBuffer = {
  "transaction:01ABC": { amount: 4500, description: "Groceries" }
}
// No duplicate! Buffer updated.
```

### Amount Conversion

```typescript
// User input: "£42.50"
// AI receives: 42.5 (decimal)
// Validation converts: 4250 (cents)
// Database stores: 4250
// Display shows: "£42.50"
```

---

## 📝 State Machine

```
idle
  ↓ AI starts composing
building (AI adds proposals to buffer)
  ↓ AI calls confirmChangeSet()
pending_approval (STREAM PAUSED, show Review Widget)
  ↓ User approves
executing (atomic transaction)
  ↓ Success
approved ✅
  ↓ Stream resumes

OR

pending_approval
  ↓ User requests changes
building (AI corrects via upsert)
  ↓ AI re-calls confirmChangeSet()
pending_approval (review again)

OR

pending_approval
  ↓ User rejects completely
rejected ❌
  ↓ Buffer cleared
idle (start fresh)
```

---

## 🐛 Troubleshooting

### "OpenAI API key required" Error
**Solution:** Add your API key to `.env.local`:
```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-...your-key-here
```

### Review Widget Not Showing
**Symptoms:** AI proposes but no review widget appears
**Solution:** Check ChangeSetContext status in React DevTools

### Changes Not Executing
**Symptoms:** User approves but nothing happens
**Solution:** Check browser console for database errors

### AI Not Responding
**Symptoms:** Loading forever after sending message
**Solution:**
1. Check network tab for /api/chat errors
2. Verify OpenAI API key is valid
3. Check OpenAI account has credits

---

## 📚 Documentation

- **Full Architecture:** `FEATURE-6-IMPLEMENTATION-STATUS.md`
- **Client-Side Tools Guide:** `lib/ai/tools/CLIENT-SIDE-TOOLS-GUIDE.md`
- **SAD Section 4:** ChangeSet Domain Logic
- **SAD Section 5:** AI & Agent Integration

---

## 🎉 Success Criteria

You'll know it's working when:

✅ You can chat with AI about expenses
✅ AI proposes transactions in natural language
✅ Review Widget shows proposed changes
✅ You can approve and see transaction created
✅ You can request changes and AI corrects
✅ Amounts convert correctly (£42.50 ↔ 4250 cents)
✅ Multiple changes execute atomically (all or nothing)

---

**Ready to use!** Navigate to the Agent tab and start chatting! 🚀
