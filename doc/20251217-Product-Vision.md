## 1) Your intention (rewritten in clear, specific English)

I’m building a mobile-first PWA household “kitty” expense-tracking app using Next.js (with the Vercel AI SDK). In the first version, all data—including transactions, categories, and the AI changeset proposals—must stay local on the user’s device (no syncing and no cloud storage).

The app’s differentiator is an AI agent that can propose new transactions and categories. Those AI suggestions are expressed as a ChangeSet that the user reviews in a widget-based UI and must explicitly approve before the changes are applied. If the user rejects a changeset, it should *remain locally available* (not be reset/cleared), so the user can revisit or modify it later.

Multi-user “household sharing” is a future phase: later I may add user accounts, groups, and shared data, but for now the product is single-device and local-only, except ai agent will be leverage openai.

## 2) Constraints / preferences inferred from your text

- **Platform**: Mobile-first PWA; desktop secondary via responsive UI.
- **Tech**: Next.js + Vercel AI SDK.
- **Hard constraint (v1)**: No cloud and no sync; data stays on-device.
- **Local persistence**: All records *and* all changesets must remain local.
- **AI scope (v1)**: AI proposes only transactions and categories.
- **Approval workflow**: User must approve before applying; rejection does **not** delete/reset the changeset.
- **UI preference**: Widget-based visualization for proposed changes.
- **Multi-user**: Not in v1; planned later with users/groups/shared data.
- **Not specified**: specific storage technology (IndexedDB/SQLite), supported mobile OS versions, offline import/export expectations, security model (PIN/biometric), and target regions/currencies.

## 3) Key decision/question you’re asking

What should you consider (and decide) for a mobile-first, local-only PWA expense tracker where AI proposes on-device changesets that must be reviewed and approved, with multi-user/cloud features deferred to a later version?
