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

## Feature 10: CSV Export

**Dependencies:** Feature 5 (manual tracking works)

**SAD References:**
- Section 3.6 (Backup & Export)

**Rationale:**
Enable users to export transaction data in CSV format for analysis in Excel, Google Sheets, or migration to other financial tools. Provides human-readable export format complementing the encrypted binary backup.

**Tasks:**

### 10.1 CSV Exporter Implementation
- [ ] Create `lib/data/export/csv-exporter.ts`:
  - Query all transactions for account
  - Convert amounts from cents to decimal (4200 → 42.00)
  - Generate CSV with headers: Date, Type, Amount, Merchant, Category, Member, Description, Account
  - Include account and member context via JOINs
  - Exclude soft-deleted records (WHERE deleted_at IS NULL)
  - Handle NULL values (merchant, category, description) gracefully
  - Escape CSV special characters (quotes, commas, newlines)
  - Use RFC 4180 CSV format

### 10.2 UI Integration
- [ ] Create export button in Settings tab ("Export to CSV")
- [ ] Add date range selector (optional):
  - All time (default)
  - Last month
  - Last 3 months
  - Custom range
- [ ] Use Capacitor Filesystem API to save CSV to Downloads folder
- [ ] Use Android share sheet to share CSV file

**Done When:**
- CSV export generates correctly with human-readable amounts
- CSV can be opened in Excel/Google Sheets without errors
- Headers match specification
- Date range filtering works correctly
- Exported files can be shared via Android share sheet

**Testing Approach:**
- **Type:** Functional testing + file verification
- **Method:** Export operations, verify file contents
- **Tests:**
  - **CSV Export:** Create 5 transactions, export CSV → verify file opens in Excel, amounts are decimal (42.00 not 4200)
  - **CSV Headers:** Verify CSV has: Date, Type, Amount, Merchant, Category, Member, Description, Account
  - **Special Characters:** Create transaction with description "Lunch at Joe's, \"Best\" Café" → verify CSV escaping correct
  - **NULL Handling:** Create transaction with no merchant → verify CSV cell is empty (not "null" or "undefined")
  - **Date Range:** Create 10 transactions over 6 months, export "Last 3 months" → verify only recent 5 transactions
  - **Share Sheet:** Export CSV → tap share → verify Android share options appear (email, Drive, etc.)

---

## Feature 11: Audit Trail View

**Dependencies:** Feature 5 (manual tracking works), ChangeSet infrastructure

**SAD References:**
- Section 3.4 (ChangeSet Domain Logic)
- Section 6.2 (Feature Layer)

**Rationale:**
Complete the "proposal-based tracking" promise by providing UI visibility into all AI-generated changesets. Users can see what the AI proposed, when, and what actions were taken. Builds trust and transparency.

**Tasks:**

### 11.1 Audit Trail Component
- [ ] Create `components/features/settings/AuditTrailView.tsx`:
  - Fetch approved changesets via `ChangeSetRepository.getApprovedByAccount()`
  - Display changeset history (date, title, source: ai/manual)
  - Show change requests for each changeset (expandable accordion)
  - Display operation details:
    - Operation type (create/update/delete)
    - Entity type (transaction/category/member)
    - Proposed data (formatted JSON or table view)
  - Filter by date range (last 7 days, last 30 days, all time)
  - Filter by source (AI vs manual)
  - Sort by date (newest first)

### 11.2 UI Integration
- [ ] Add "Audit Trail" button in Settings tab ("Data Management" section)
- [ ] Use modal or full-screen view for audit trail
- [ ] Add search functionality (search by title, description)
- [ ] Add pagination (load 20 at a time, "Load More" button)

### 11.3 Data Formatting
- [ ] Format timestamps in user-friendly format ("2 hours ago", "Dec 25, 2024")
- [ ] Format amounts in human-readable currency (4200 cents → £42.00)
- [ ] Color-code by source:
  - AI proposals: Blue accent
  - Manual changes: Green accent
- [ ] Show icons for operation types:
  - Create: Plus icon
  - Update: Edit icon
  - Delete: Trash icon

**Done When:**
- Audit trail shows all approved changesets with details
- Change requests expand to show operation details
- Filters (date range, source) work correctly
- Search functionality works
- Pagination loads additional changesets correctly
- UI is intuitive and readable

**Testing Approach:**
- **Type:** UI testing + data accuracy verification
- **Method:** Create test changesets, verify display
- **Tests:**
  - **Audit Trail Display:** Approve 3 changesets, view audit trail → verify all 3 shown with dates, titles, source (ai/manual)
  - **Audit Expansion:** Click changeset → verify change requests expand showing operation details
  - **Date Filter:** Approve changeset today and one last month, filter "Last 7 days" → verify only today's shown
  - **Source Filter:** Approve 2 AI changesets and 1 manual, filter "AI only" → verify manual hidden
  - **Search:** Create changeset with title "Grocery expenses", search "grocery" → verify found
  - **Pagination:** Approve 25 changesets, view audit trail → verify shows 20 + "Load More" button
  - **Empty State:** View audit trail with no approved changesets → verify shows "No audit history yet"

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

## Feature 12: Backup & Restore Enhancements

**Dependencies:** Feature 7 (basic backup/restore working)

**Rationale:**
Enhance the basic backup/restore functionality with encryption, automation, history management, and cross-device sync capabilities. These features build on the v1.2 foundation to provide enterprise-grade data management.

---

### FF-013
- **ID**: FF-013
- **Title**: Encrypted Backups with User Password
- **Description / Problem statement**: Add proper encryption to backup files with user-controlled passwords. Implements AES-256-GCM encryption, PBKDF2 key derivation (600k iterations), and custom .ourpot file format. Includes password strength validation, confirmation UI, and decryption on restore. V1.2 has unencrypted backups only.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 8
- **Score**: 0.63
- **Related**: See original encryption spec in v1.2 git history

---

### FF-014
- **ID**: FF-014
- **Title**: Biometric unlock for backup encryption
- **Description / Problem statement**: Allow users to unlock encrypted backups using fingerprint/face recognition instead of password. Store encrypted password in Android Keystore, decrypt with biometric auth. Reduces friction for frequent backups while maintaining security. Requires FF-013 (encrypted backups) first.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-015
- **ID**: FF-015
- **Title**: Android Keystore integration for encryption keys
- **Description / Problem statement**: Use Android Keystore API to generate and store encryption keys instead of password-derived keys. Hardware-backed security, keys never exposed to app memory. Prevents extraction even with root access. Backups tied to device (not portable). Alternative to FF-013 for device-local encryption.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 4
- **Effort / Size**: 8
- **Score**: 0.50

---

### FF-016
- **ID**: FF-016
- **Title**: Automatic scheduled backups
- **Description / Problem statement**: Schedule daily/weekly automatic backups in background using Android WorkManager. Upload to user's cloud storage (Drive/Dropbox) automatically. Configurable schedule (daily, weekly, monthly). Notification on backup success/failure. Reduces risk of data loss from forgotten manual backups.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 5
- **Effort / Size**: 8
- **Score**: 0.63

---

### FF-017
- **ID**: FF-017
- **Title**: Backup history and version management
- **Description / Problem statement**: Keep last N backups (user configurable, default 7). Show backup list with dates, sizes, transaction counts. Allow restoring from any previous backup. Compare backups (diff view showing changes). Delete old backups. Prevents "I restored the wrong backup" disasters.
- **Type**: Feature
- **Priority**: P2
- **Impact / Value**: 4
- **Effort / Size**: 5
- **Score**: 0.80

---

### FF-018
- **ID**: FF-018
- **Title**: Selective restore from backup
- **Description / Problem statement**: Restore specific date ranges or categories from backup instead of full replace. E.g., "Restore only December transactions" or "Restore only Grocery category". Merge with current data instead of replace. Useful for recovering accidentally deleted data without losing recent changes.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 3
- **Effort / Size**: 8
- **Score**: 0.38

---

### FF-019
- **ID**: FF-019
- **Title**: Cross-device sync via cloud storage
- **Description / Problem statement**: Sync database across multiple devices via user's cloud storage (Drive, Dropbox). Implement operational transformation or CRDT for conflict resolution. Merge changesets from different devices. Enable household sharing workflow (multiple people editing same pot). Major architectural change requiring distributed systems patterns.
- **Type**: Feature
- **Priority**: P3
- **Impact / Value**: 5
- **Effort / Size**: 21
- **Score**: 0.24
- **Related**: See Product Vision Section 7 (Future Horizon - Multi-User Household Syncing)

---

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
