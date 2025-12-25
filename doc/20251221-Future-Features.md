# V2 Feature Roadmap

Important: Please note that the Feature number might change!!

**Status:** Out of scope for v1
**Purpose:** Track features intentionally deferred to v2 or beyond

This document maintains a list of features and enhancements that are explicitly out of scope for v1. These items represent future product evolution and are documented here to:
- Keep v1 scope focused and achievable
- Track future product direction
- Prevent scope creep during v1 implementation

---

## Scoring Conventions

- **Priority**: P2 (could have in v2), P3 (nice to have later), P4 (maybe someday)
- **Impact/Value**: 1–5 (5 = highest user/business value)
- **Effort/Size**: story points (1, 2, 3, 5, 8, 13)
- **Score**: `Impact ÷ Effort` (value/effort ratio for prioritization)



## Feature 8: Analytics & Insights (Optional for MVP)

**Dependencies:** Feature 5 (transaction data exists)

**v0 Prototype Reference:** `v0-our-pot-expense-tracker/components/analytics-tab.tsx` - Analytics dashboard UI

**SAD References:**
- Section 6.2 (Feature Layer - analytics feature)

**Tasks:**

### 8.1 Spending Charts
- [ ] Install chart library (recharts or chart.js)
- [ ] Create `components/features/analytics/SpendingChart.tsx`:
  - Line chart: spending over time (daily/weekly/monthly)
  - Query transactions by date range
  - Group by date period
  - Display total expenses per period
- [ ] Create `components/features/analytics/CategoryBreakdown.tsx`:
  - Pie chart: spending by category
  - Query transactions grouped by category
  - Calculate percentage per category
  - Display top N categories

### 8.2 Summary Stats
- [ ] Create `components/features/analytics/SummaryStats.tsx`:
  - Total spent (sum of EXPENSE transactions)
  - Total deposited (sum of DEPOSIT transactions)
  - Net balance (deposits - expenses)
  - Average transaction size
  - Transaction count
  - Top category (most spent)
  - Top merchant (most spent)

### 8.3 Member Contributions
- [ ] Create `components/features/analytics/MemberContributions.tsx`:
  - Bar chart: spending per member
  - Query transactions grouped by member
  - Exclude kitty member
  - Show who paid most/least

### 8.4 Date Range Selector
- [ ] Add date range picker to analytics tab
- [ ] Presets: This week, This month, Last month, Last 3 months, This year, All time
- [ ] Update all charts based on selected range

**Done When:**
- Spending over time chart displays correctly
- Category breakdown pie chart displays correctly
- Summary stats calculate correctly
- Member contributions chart displays correctly
- Date range filter updates all analytics
- Charts handle empty data gracefully

**Testing Approach:**
- **Type:** Visual testing + data accuracy verification
- **Method:** Create test data, verify chart accuracy
- **Tests:**
  - **Spending Over Time:** Create 10 transactions across 3 months → verify line chart shows correct totals per month
  - **Category Breakdown:** Create 5 transactions in 3 categories → verify pie chart percentages add to 100%
  - **Summary Stats:** Create £100 expense + £50 deposit → verify "Total Spent: £100, Total Deposited: £50, Net: -£50"
  - **Member Contributions:** Create 3 transactions by Alice, 2 by Bob → verify bar chart shows Alice > Bob
  - **Date Range Filter:** Select "Last Month" → verify charts update to only show last month's data
  - **Empty State:** Clear all transactions → verify charts show "No data yet" message

---

## Feature 9: Native Android Build & Distribution

**Dependencies:** Feature 6 (core app complete)

**SAD References:**
- Section 7.2 (Build Pipeline)
- Section 7.3 (Android Deployment)
- Section 8.1 (Capacitor Configuration)
- Section 8.2 (Asset Management)

**Tasks:**

### 9.1 Capacitor Configuration
- [ ] Configure `capacitor.config.ts`:
  - App ID (com.ourpot.app or similar)
  - App name ("OurPot")
  - Web directory (out)
  - Android configuration (minSdkVersion: 22, targetSdkVersion: 34)
- [ ] Configure permissions in `AndroidManifest.xml`:
  - File system access (for export)
  - Internet access (for AI API)

### 9.2 App Icons & Splash Screens
- [ ] Generate app icons for Android (adaptive icons):
  - hdpi (72x72)
  - mdpi (48x48)
  - xhdpi (96x96)
  - xxhdpi (144x144)
  - xxxhdpi (192x192)
- [ ] Generate splash screen assets
- [ ] Add icons to `android/app/src/main/res/`

### 9.3 Build Pipeline
- [ ] Run `npm run build` to generate static export
- [ ] Run `npx cap sync` to copy assets to Android project
- [ ] Open Android Studio: `npx cap open android`
- [ ] Test on emulator
- [ ] Test on physical device via USB debugging

### 9.4 APK Generation
- [ ] Configure signing in Android Studio (debug keystore)
- [ ] Build debug APK: Build → Build Bundle(s) / APK(s) → Build APK(s)
- [ ] Test APK installation on device
- [ ] (Optional) Generate release APK with release keystore

### 9.5 Testing on Device
- [ ] Enable USB debugging on Android device
- [ ] Connect via ADB
- [ ] Deploy via Android Studio
- [ ] Test all features on physical device:
  - Database persistence after app restart
  - Native SQLite (not WASM)
  - Transaction CRUD
  - AI changeset workflow
  - Export functionality
  - File sharing

**Done When:**
- APK installs on Android device
- App uses native SQLite (not WASM)
- Database persists after app close/reopen
- All features work on native Android
- Export files save to device storage
- Share sheet works for CSV/DB export

**Testing Approach:**
- **Type:** Native device testing
- **Method:** Physical Android device testing
- **Tests:**
  - **APK Install:** Transfer APK to device → install → verify app launches
  - **Native SQLite:** Check Capacitor.getPlatform() returns 'android' → verify using native plugin not WASM
  - **Data Persistence:** Create 3 transactions, close app, reopen → verify transactions still present
  - **App Restart:** Force close app, reopen → verify database connection re-establishes
  - **Export to Storage:** Export CSV → verify file appears in Android Downloads folder
  - **Share Sheet:** Export CSV → tap share → verify Android native share options work
  - **Permissions:** Verify app requests only necessary permissions (storage, internet)
  - **Performance:** Create 100 transactions → verify list scrolls smoothly, no lag

---

## Optional: Polish & UX Improvements (Post-MVP)

**Dependencies:** All core features complete

**Tasks:**

### UI/UX Polish
- [ ] Add loading skeletons for data fetching
- [ ] Add empty state illustrations
- [ ] Add success/error toast notifications
- [ ] Add pull-to-refresh on transaction list
- [ ] Add swipe gestures for delete
- [ ] Add haptic feedback for key actions
- [ ] Optimize for different screen sizes (small phones, tablets)

### Performance
- [ ] Add pagination for transaction list (load more on scroll)
- [ ] Optimize queries with proper indexes (already in schema)
- [ ] Add debouncing for search inputs
- [ ] Lazy load chart libraries

### Accessibility
- [ ] Add ARIA labels
- [ ] Test with screen reader
- [ ] Ensure sufficient color contrast
- [ ] Add keyboard navigation support

**Done When:**
- App feels polished and native
- No janky animations or slow queries
- Accessible to users with disabilities

**Testing Approach:**
- **Type:** Usability and performance testing
- **Method:** User testing + automated performance profiling
- **Tests:**
  - **Loading States:** Navigate to transaction list while data loading → verify skeleton appears
  - **Pull-to-Refresh:** Swipe down on transaction list → verify refresh animation and data reload
  - **Swipe Gestures:** Swipe transaction card left → verify delete option appears
  - **Screen Sizes:** Test on small phone (5") and large phone (6.5") → verify responsive layout
  - **Screen Reader:** Enable TalkBack → verify all buttons have descriptive labels
  - **Color Contrast:** Check WCAG AA compliance for text/background colors
  - **Performance:** Load 1000 transactions → verify list scrolls at 60fps

## Others Deferred Features

### FF-001
- **ID**: FF-001
- **Title**: Persistent storage request for web/PWA distribution
- **Description / Problem statement**: When/if web/PWA distribution is added, request persistent storage (`navigator.storage.persist()`) to reduce risk of browser eviction, and surface a lightweight "storage status" indicator for users/debugging. Not applicable to native Android build which uses native file system.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 3
- **Score**: 1.33

---

### FF-002
- **ID**: FF-002
- **Title**: Edit AI suggestions before approval (inline edits)
- **Description / Problem statement**: Allow user to modify proposed transaction fields (amount/date/category/note) inside the review widget prior to approval, so AI output becomes a draft not a final write. v1 supports iterative rejection/refinement via conversation, but not in-place edits.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 8
- **Score**: 0.63

---

### FF-003
- **ID**: FF-003
- **Title**: ChangeSet conflict detection on apply
- **Description / Problem statement**: When underlying entities change after proposal (e.g., user manually edits transaction while reviewing AI changeset), applying the ChangeSet can produce wrong results or partial intent. Add precondition checks (optimistic locking) and block apply with clear reasons. No auto-rebase in early versions.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 5
- **Score**: 1.00

---

### FF-004
- **ID**: FF-004
- **Title**: AI rationale + "what data was used" audit fields
- **Description / Problem statement**: Store a short rationale + extracted facts/context window metadata for each ChangeSet so users can trust AI decisions and developers can debug model mistakes. v1 includes basic audit trail (toolCallId, source) but not detailed reasoning.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 3
- **Score**: 1.33

---

### FF-005
- **ID**: FF-005
- **Title**: Undo foundation: lightweight revision/event log
- **Description / Problem statement**: Add minimal event log (or revision snapshots per changeset apply) to enable undo functionality later. Even if undo UI is deferred, the data structure should exist. v1 has soft deletes but no full revision history.
- **Type**: Tech Debt
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 8
- **Score**: 0.50

---

### FF-006
- **ID**: FF-006
- **Title**: Import/restore from backup
- **Description / Problem statement**: Allow importing exported CSV or SQLite .db file to restore data on same/new device. Define merge/overwrite behavior (likely "replace" in early versions). v1 includes export but not import functionality.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-007
- **ID**: FF-007
- **Title**: Analytics integration (Google Analytics or alternative)
- **Description / Problem statement**: Add product analytics to track activation, retention, and feature usage. Define event taxonomy and privacy boundaries (ensure no sensitive expense content captured). Deferred to focus on core functionality first.
- **Type**: Research
- **Priority**: P3
- **Impact / Value**: 3
- **Effort / Size**: 5
- **Score**: 0.60

---

### FF-008
- **ID**: FF-008
- **Title**: Transfers + category semantics
- **Description / Problem statement**: Define transaction types beyond EXPENSE/DEPOSIT (add TRANSFER for moving money between accounts or to/from kitty). Define category constraints and reporting behavior so "kitty" money flows are properly tracked and don't break analytics. v1 uses simple EXPENSE/DEPOSIT only.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-009
- **ID**: FF-009
- **Title**: App lock / local encryption-at-rest
- **Description / Problem statement**: Add optional PIN/biometric lock and/or encryption for local storage (SQLCipher). Explicitly deferred as very low priority - relies on device-level security in v1.
- **Type**: Research
- **Priority**: P4
- **Impact / Value**: 2
- **Effort / Size**: 13
- **Score**: 0.15

---

### FF-010
- **ID**: FF-010
- **Title**: Future multi-user/sharing readiness fields (placeholders only)
- **Description / Problem statement**: Add nullable fields like `createdByUserId?`, `householdId?`, and `deviceId?` to ease later transition to accounts/groups, without implementing sharing now. Requires schema migration planning.
- **Type**: Tech Debt
- **Priority**: P2
- **Impact / Value**: 3
- **Effort / Size**: 3
- **Score**: 1.00

---

### FF-011
- **ID**: FF-011
- **Title**: Evaluate Konsta UI for native-feeling components
- **Description / Problem statement**: Research and test Konsta UI for iOS/Material Design components (pull-to-refresh, modals, native gestures). Optional UX polish planned for Phase 3 but should be evaluated early for architectural fit. v1 uses shadcn/ui + Tailwind.
- **Type**: Research
- **Priority**: P3
- **Impact / Value**: 3
- **Effort / Size**: 3
- **Score**: 1.00

---

### FF-012
- **ID**: FF-012
- **Title**: PWA/Serwist integration (deferred, web-only)
- **Description / Problem statement**: If/when web/PWA distribution is added, integrate Serwist service worker with gated registration (disabled in Capacitor). Per TDD-1, explicitly deferred for v1 Android-first approach. Native build doesn't need service workers.
- **Type**: Feature
- **Priority**: P4
- **Impact / Value**: 2
- **Effort / Size**: 5
- **Score**: 0.40

---

## Explicitly Out of Scope (v2 or Beyond)

The following major features are explicitly deferred to v2 or later versions:

- **Multi-user accounts and household sharing** - v1 is single-device, single-user only
- **Cloud sync or multi-device reconciliation** - v1 is local-first with no cloud backend
- **Automatic scheduled backups** - v1 has manual export only
- **Database encryption at rest** - v1 relies on device-level security (SQLCipher integration deferred)
- **iOS platform build** - v1 is Android-first; iOS build via CI/CD when needed
- **PWA as primary distribution** - PWA is secondary/experimental in v1 (native Android is primary)
- **Offline AI** - All AI inference requires network connection to OpenAI API

---

## Related Documents

- **[V1 Features](./20251219-Feature-v1.md)** - Active v1 implementation scope
- **[Software Architecture Document](./20251218-SAD-v1-0-Table%20of%20content.md)** - Architectural decisions and patterns
- **[Product Vision](./20251218-Product-Vision.md)** - Long-term product strategy
