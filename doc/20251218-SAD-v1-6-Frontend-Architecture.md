# SAD Section 6: Frontend Architecture (Next.js + Layered Design)

**Project:** OurPot - Household Kitty Expense Tracker
**Version:** v1.0 (Local-Only)
**Date:** 2025-12-18
**Status:** Living Document

---

## 6.1 Technology Stack

**Core:**
- Next.js 16+ (App Router, static export mode)
- React 19 (client components only)
- Tailwind CSS 4.x + shadcn/ui
- TypeScript

**Key Libraries:**
- SQLite: `@capacitor-community/sqlite` (native), `jeep-sqlite` (WASM fallback)
- AI: Vercel AI SDK
- Forms: react-hook-form + zod
- UI: Radix UI primitives via shadcn/ui

---

## 6.2 Layered Architecture Pattern

### The Four-Layer Model

To manage complexity, the frontend is organized into **four distinct layers** with clear responsibilities:

```
┌─────────────────────────────────────────────────────┐
│          PRESENTATION LAYER                          │
│  (UI Components - shadcn/ui, custom widgets)        │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│          FEATURE LAYER                               │
│  (Business logic, feature components)               │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│          DATA LAYER                                  │
│  (Repositories, SQLite context, keyed buffer)       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│          INFRASTRUCTURE LAYER                        │
│  (Platform detection, utilities, Capacitor bridge)  │
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**Layer 1: Presentation** (`/components/ui/`, `/components/widgets/`)
- **Purpose:** Reusable, stateless UI primitives
- **Examples:** Button, Input, Card, Dialog, Sheet
- **Dependencies:** Only Tailwind CSS and Radix UI
- **Rule:** No business logic, no data access, accepts props only

**Layer 2: Feature** (`/components/features/`, `/app/`)
- **Purpose:** Feature-specific components with business logic
- **Examples:** TransactionList, AddExpenseForm, ReviewWidget, AgentChat
- **Dependencies:** Can use Presentation components and Data layer hooks
- **Rule:** Encapsulates feature behavior, orchestrates UI and data

**Layer 3: Data** (`/lib/data/`, `/lib/contexts/`)
- **Purpose:** Data access, state management, repository pattern
- **Examples:** SQLiteContext, TransactionRepository, ChangeSetBuffer
- **Dependencies:** Infrastructure layer for platform detection
- **Rule:** Abstracts database operations, provides React hooks for features

**Layer 4: Infrastructure** (`/lib/platform/`, `/lib/utils/`)
- **Purpose:** Platform-specific code, utilities, Capacitor bridge
- **Examples:** Platform detection, SQLite initialization, ULID generation
- **Dependencies:** None (lowest layer)
- **Rule:** No UI concerns, pure utility functions

---

## 6.3 Directory Structure (Proposed)

### Recommended Organization

```
app/
├── layout.tsx                 # Root layout (theme provider, SQLite init)
├── page.tsx                   # Main app shell (tab navigation)
└── globals.css                # Global Tailwind imports

components/
├── features/                  # Feature Layer
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   ├── AddExpenseForm.tsx
│   │   ├── TransactionFilters.tsx
│   │   └── TransactionCard.tsx
│   ├── categories/
│   │   ├── CategoryGrid.tsx
│   │   ├── CategoryPicker.tsx
│   │   └── AddCategoryForm.tsx
│   ├── members/
│   │   ├── MemberList.tsx
│   │   ├── MemberCard.tsx
│   │   └── AddMemberForm.tsx
│   ├── agent/
│   │   ├── AgentChatPanel.tsx
│   │   ├── AgentInput.tsx
│   │   └── ReviewWidget.tsx        # ChangeSet approval widget
│   ├── analytics/
│   │   ├── SpendingChart.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   └── MemberContributions.tsx
│   └── settings/
│       ├── SettingsPanel.tsx
│       └── BackupExport.tsx
│
├── widgets/                   # Composite UI Components
│   ├── KittyBalanceCard.tsx
│   ├── QuickActions.tsx
│   ├── BottomNav.tsx
│   └── PotSwitcher.tsx
│
└── ui/                        # Presentation Layer (shadcn/ui)
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── sheet.tsx
    ├── tabs.tsx
    └── ...

lib/
├── data/                      # Data Layer
│   ├── contexts/
│   │   ├── SQLiteContext.tsx      # Platform-aware DB initialization
│   │   ├── ChangeSetContext.tsx   # Keyed buffer state management
│   │   └── AccountContext.tsx     # Current account selection
│   ├── repositories/
│   │   ├── TransactionRepository.ts
│   │   ├── CategoryRepository.ts
│   │   ├── MemberRepository.ts
│   │   └── ChangeSetRepository.ts
│   └── hooks/
│       ├── useTransactions.ts     # Custom hook for transaction queries
│       ├── useCategories.ts
│       ├── useMembers.ts
│       └── useChangeSet.ts        # Access keyed buffer
│
├── platform/                  # Infrastructure Layer
│   ├── sqlite.ts                  # SQLite initialization (native vs WASM)
│   ├── platform-detect.ts         # Capacitor.getPlatform()
│   └── capacitor-config.ts        # Capacitor configuration helpers
│
├── ai/                        # AI Integration
│   ├── tools/                     # AI tool definitions
│   │   ├── read-tools.ts          # getCategories, getMembers, searchTransactions
│   │   ├── proposal-tools.ts      # createTransactionChangeRequest, etc.
│   │   └── confirmation-tools.ts  # confirmChangeSet, resetChangeSet
│   ├── prompts.ts                 # System prompt templates
│   └── validation.ts              # Amount conversion, validation logic
│
└── utils/                     # Utilities
    ├── format.ts                  # Currency formatting, date formatting
    ├── ulid.ts                    # ULID generation
    └── cn.ts                      # Tailwind class merging

public/
└── icons/                     # App icons, splash screens

styles/
└── globals.css                # Tailwind base, components, utilities
```

### Rationale for Structure

**Why `/components/features/` by domain?**
- Groups related components together (all transaction components in one place)
- Easier to find and maintain
- Clear feature boundaries

**Why `/components/widgets/`?**
- Intermediate layer between pure UI and complex features
- Composite components that combine multiple UI primitives
- Not feature-specific (used across multiple tabs)

**Why `/lib/data/repositories/`?**
- Encapsulates all database operations
- Testable without UI
- Consistent API for all entities
- Repository pattern (see Section 3.4)

**Why `/lib/ai/tools/`?**
- Separates AI tool definitions from UI logic
- Keeps AI integration modular
- Easy to add new tools

---

## 6.4 State Management Strategy

### No Global State Library (Keep it Simple)

**Philosophy:** Avoid Redux/Zustand/Jotai complexity for v1. Use React's built-in state management.

### Three State Categories

#### 1. Server State (Database)
**Pattern:** Repository + React Query pattern (or custom hooks)

```typescript
// Custom hook wraps repository
function useTransactions(accountId: string, filters?: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const repo = new TransactionRepository();
    repo.getAllByAccount(accountId, filters).then(setTransactions);
  }, [accountId, filters]);

  return { transactions, loading };
}

// Component usage
const { transactions, loading } = useTransactions(currentAccountId);
```

**Rationale:** Database is source of truth. Queries are cheap (local SQLite). No need for complex caching.

#### 2. UI State (Ephemeral)
**Pattern:** Component-local useState

```typescript
// Modal open/close, form inputs, tab selection
const [isOpen, setIsOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState("transactions");
```

**Rationale:** UI state is transient. Keep it local to components that need it.

#### 3. Cross-Cutting State (Context)
**Pattern:** React Context for shared state

```typescript
// SQLiteContext - database connection (initialization state)
// ChangeSetContext - keyed buffer (AI proposal accumulation)
// AccountContext - current account selection
// ThemeContext - dark/light mode (next-themes)
```

**Rationale:** Some state needs to be accessible across component tree. Context is sufficient.

### Context Structure

#### SQLiteContext

**Purpose:** Initialize and provide database connection to entire app.

**State:**
- Database connection status (initializing | ready | error)
- Platform type (web | android | ios)
- Database instance reference

**Usage:**
```typescript
const { db, isReady, platform } = useContext(SQLiteContext);
```

#### ChangeSetContext

**Purpose:** Manage keyed buffer for AI changeset proposals.

**State:**
- Keyed buffer (Map<string, ChangeRequest>)
- Current changeset status (idle | building | pending_approval)
- Changeset metadata (title, description)

**Methods:**
- `addChangeRequest(key, request)` - Upsert to buffer
- `removeChangeRequest(key)` - Discard from buffer
- `clearBuffer()` - Reset
- `transitionToPendingApproval()` - Submit for review
- `transitionToBuilding()` - Rejection with feedback

**Usage:**
```typescript
const { buffer, status, addChangeRequest } = useContext(ChangeSetContext);
```

#### AccountContext

**Purpose:** Track currently selected account (for multi-account future).

**State:**
- Current account ID
- Account metadata (name, currency, balance)

**Methods:**
- `switchAccount(accountId)` - Change active account

**Usage:**
```typescript
const { currentAccount, switchAccount } = useContext(AccountContext);
```

---

## 6.5 Component Patterns & Best Practices

### Pattern 1: Feature Components as Orchestrators

**Principle:** Feature components coordinate UI and data, don't render directly.

**Example: AddExpenseForm**
```typescript
// components/features/transactions/AddExpenseForm.tsx
export function AddExpenseForm() {
  const { categories } = useCategories();          // Data hook
  const { members } = useMembers();                // Data hook
  const { addChangeRequest } = useChangeSet();     // Context

  const form = useForm<ExpenseFormData>({          // Form state
    resolver: zodResolver(expenseSchema)
  });

  const onSubmit = (data: ExpenseFormData) => {
    // Business logic: transform, validate, create change request
    const changeRequest = buildChangeRequest(data);
    addChangeRequest(`transaction:${ulid()}`, changeRequest);
  };

  return (
    <Sheet>
      <SheetContent>
        <Form {...form}>
          <FormField name="amount" render={() => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
            </FormItem>
          )} />

          <FormField name="categoryId" render={() => (
            <CategoryPicker categories={categories} {...field} />
          )} />

          {/* More fields... */}

          <Button type="submit">Add to Changeset</Button>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

**Key Points:**
- Uses custom hooks for data access
- Uses context for changeset buffer
- Composes UI components (Sheet, Form, Input, Button)
- Business logic stays in component, not in UI primitives

### Pattern 2: Repository Abstraction

**Principle:** Never call SQLite directly from components. Always use repositories.

**Example: TransactionRepository**
```typescript
// lib/data/repositories/TransactionRepository.ts
export class TransactionRepository {
  constructor(private db: SQLiteDatabase) {}

  async getAllByAccount(
    accountId: string,
    filters?: { startDate?: Date, endDate?: Date, sort?: string, order?: string }
  ): Promise<Transaction[]> {
    // SQL query construction
    // Returns typed Transaction objects
  }

  async create(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    // INSERT operation
    // Triggers balance update
  }

  async update(id: string, changes: Partial<Transaction>): Promise<void> {
    // UPDATE operation
  }

  async softDelete(id: string): Promise<void> {
    // UPDATE deletedAt = NOW()
  }
}
```

**Benefits:**
- Centralized data access logic
- Consistent error handling
- Testable without UI
- Easy to mock for tests

### Pattern 3: Review Widget (Changeset Approval)

**Special Pattern:** The review widget is unique - it renders during AI stream pause.

**Location:** `components/features/agent/ReviewWidget.tsx`

**Trigger:** When `confirmChangeSet()` tool is called by AI.

**Behavior:**
1. AI calls `confirmChangeSet()`
2. Client-side handler does NOT call `addToolOutput()` immediately
3. `ChangeSetContext` transitions to `pending_approval`
4. ReviewWidget renders imperatively (not reactive)
5. User approves/rejects
6. `addToolOutput()` called with decision
7. AI stream resumes

**Implementation Approach:**
```typescript
// components/features/agent/ReviewWidget.tsx
export function ReviewWidget() {
  const { changeset, status } = useChangeSet();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for pending_approval status
    if (status === "pending_approval") {
      setIsOpen(true);
    }
  }, [status]);

  const handleApprove = async () => {
    const results = await executeChangeSet(changeset);
    addToolOutput({ status: "approved", results });
    setIsOpen(false);
  };

  const handleReject = (feedback?: string) => {
    if (feedback) {
      // Iterative correction
      transitionToBuilding();
      addToolOutput({ status: "rejected_with_feedback", feedback });
    } else {
      // Complete rejection
      addToolOutput({ status: "rejected_completely" });
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{changeset?.title}</DialogTitle>
        </DialogHeader>

        {/* Render change requests with before/after */}
        <ChangeRequestList requests={changeset?.changeRequests} />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleReject()}>
            Reject
          </Button>
          <Button onClick={handleApprove}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6.6 Navigation & Routing

### Single-Page Application (No Routing)

**Architecture:** One page (`app/page.tsx`) with tab-based navigation.

**Rationale:**
- Simpler state management (no URL state to sync)
- Faster tab switching (no page reloads)
- Better for Capacitor (feels native)
- All data in memory (no route-based data fetching)

### Tab Structure

**Tabs:**
1. **Home** - Dashboard, recent transactions, quick actions
2. **Transactions** - Full transaction list with filters
3. **Analytics** - Charts and spending insights
4. **Agent** - AI chat interface
5. **Settings** - Backup, export, preferences

**Implementation:**
```typescript
// app/page.tsx
export default function HomePage() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex flex-col h-screen">
      <TabContent activeTab={activeTab} />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function TabContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case "home":
      return <HomeTab />;
    case "transactions":
      return <TransactionsTab />;
    case "analytics":
      return <AnalyticsTab />;
    case "agent":
      return <AgentTab />;
    case "settings":
      return <SettingsTab />;
  }
}
```

**Bottom Navigation:**
- Fixed position (bottom of screen)
- Mobile-first design (large touch targets)
- Active tab highlighted
- Icons from lucide-react

---

## 6.7 Mobile-First Design

**Principles:**
- Design priority: Mobile (primary) → Tablet → Desktop
- Minimum touch targets: 44x44px
- Bottom navigation for primary actions
- Mobile-optimized keyboards (inputMode attributes)
- Touch gestures via vaul and radix-ui primitives

---

## 6.8 Dark Mode

**Implementation:** next-themes library with CSS variable theming.

**Approach:** Tailwind classes automatically respond to `.dark` class via CSS variables for colors.

---

## Frontend Architecture Summary

**Key Architectural Decisions:**

1. **Four-Layer Architecture:** Presentation → Feature → Data → Infrastructure (clear separation of concerns)
2. **Repository Pattern:** Centralized data access, testable, consistent API
3. **Context for Cross-Cutting Concerns:** SQLite, ChangeSet buffer, Account selection
4. **No Global State Library:** React Context + hooks sufficient for v1
5. **Feature-Based Component Organization:** Group by domain (transactions, categories, agent)
6. **Single-Page Tab Navigation:** Simpler than routing, better for mobile
7. **Mobile-First Design:** 44px touch targets, optimized inputs, bottom navigation
8. **Static Export:** All client-side, bundled for Capacitor

**Trade-offs Accepted:**

- **No Server Components:** Static export limitation, acceptable for local-only app
- **No Routing:** Simpler architecture, trade-off for potential deep linking (not needed in v1)
- **Repository Boilerplate:** More code than direct DB access, but cleaner architecture
- **Context Re-renders:** Potential performance concern, mitigated by careful context splitting

**Benefits Realized:**

- ✅ **Clear Separation:** Easy to find and modify code
- ✅ **Testable Architecture:** Repositories and hooks testable independently
- ✅ **Maintainable:** Feature boundaries prevent spaghetti code
- ✅ **Extensible:** Adding new features follows clear patterns
- ✅ **Mobile-Optimized:** Touch-friendly, responsive, native feel

---

**End of Section 6**
