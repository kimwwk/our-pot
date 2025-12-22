# V2 Feature Roadmap

Important: Please note that the Feature number might change!!

## Feature 7: Data Management & Export

**Dependencies:** Feature 5 (manual tracking works)

**v0 Prototype Reference:** `v0-our-pot-expense-tracker/components/settings-tab.tsx` - Settings UI with export buttons

**SAD References:**
- Section 3.6 (Backup & Export)

**Tasks:**

### 7.1 CSV Export
- [ ] Create `lib/data/export/csv-exporter.ts`:
  - Query all transactions for account
  - Convert amounts from cents to decimal (4200 → 42.00)
  - Generate CSV with headers: Date, Type, Amount, Merchant, Category, Member, Description, Account
  - Include account and member context
  - Exclude soft-deleted records
- [ ] Create export button in Settings tab
- [ ] Use Capacitor Filesystem API to save CSV to Downloads folder
- [ ] Use Android share sheet to share CSV file

### 7.2 Full Database Backup
- [ ] Create `lib/data/export/db-exporter.ts`:
  - Export entire SQLite .db file (binary)
  - Name format: `ourpot-backup-YYYYMMDD-HHMMSS.db`
- [ ] Create backup button in Settings tab
- [ ] Save to device storage using Capacitor Filesystem API
- [ ] Use Android share sheet to share .db file

### 7.3 Audit Trail View
- [ ] Create `components/features/settings/AuditTrailView.tsx`:
  - Fetch approved changesets via ChangeSetRepository.getApprovedByAccount()
  - Display changeset history (date, title, source: ai/manual)
  - Show change requests for each changeset (expandable)
  - Filter by date range
  - Filter by source (AI vs manual)
- [ ] Add audit trail link in Settings tab

**Done When:**
- CSV export generates correctly with human-readable amounts
- CSV can be opened in Excel/Google Sheets
- Full .db backup can be exported
- Exported files can be shared via Android share sheet
- Audit trail shows all approved changesets with details

**Testing Approach:**
- **Type:** Functional testing + file verification
- **Method:** Export operations, verify file contents
- **Tests:**
  - **CSV Export:** Create 5 transactions, export CSV → verify file opens in Excel, amounts are decimal (42.00 not 4200)
  - **CSV Headers:** Verify CSV has: Date, Type, Amount, Merchant, Category, Member, Description, Account
  - **Full Backup:** Export .db file → verify file size > 0, filename format `ourpot-backup-YYYYMMDD-HHMMSS.db`
  - **Share Sheet:** Export CSV → tap share → verify Android share options appear (email, Drive, etc.)
  - **Audit Trail:** Approve 3 changesets, view audit trail → verify all 3 shown with dates, titles, source (ai/manual)
  - **Audit Expansion:** Click changeset → verify change requests expand showing operation details

---

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

