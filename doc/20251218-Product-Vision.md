# Product Vision Document

**Project Codename:** Our Pot / House Kitty  
**Version:** 1.0 (Foundation)

## 1. Vision Statement
To provide a private, intelligent, and human-centric financial tracking experience where **AI assists but never overrides**, ensuring users maintain total sovereignty over their household data.

## 2. Target Audience
*   **Primary:** Individuals and household managers who find manual expense tracking tedious but do not trust cloud-based fintech apps with their data.
*   **Secondary:** Users who require granular control over categorization and refuse to accept "black box" auto-categorization errors.

## 3. The Problem
*   **Privacy vs. Convenience:** Users are forced to choose between the privacy of a spreadsheet (tedious manual entry) and the convenience of modern apps (which require linking bank accounts to the cloud and risking data privacy).
*   **Lack of Control:** Automated apps often miscategorize transactions. Correcting them is frustrating, and users rarely see *why* a change was made.
*   **Data Ephemerality:** In most apps, if you reject a suggestion or delete a draft, it is gone forever. This prevents users from revisiting past ideas or understanding the AI's logic later.

## 4. The Solution: "Proposal-Based" Tracking
Unlike apps that silently update your ledger, this product operates on a **"Propose & Approve"** model.

*   **Local Intelligence:** An on-device AI acts as a junior accountant. It scans inputs and drafts a "ChangeSet" (a bundle of proposed new transactions or categories).
*   **Human Authority:** The AI never writes to the ledger directly. The user reviews proposals via a clear, widget-based dashboard. The user is the final gatekeeper.
*   **Non-Destructive History:** A proposal is a record in itself. If a user rejects a proposal, it is filed away, not deleted. The user can retrieve, edit, and reactivate "rejected" ideas at any time.

## 5. Key Product Principles (v1)

### A. Privacy First (Zero-Knowledge)
The application functions entirely offline. No financial data leaves the device. The user owns the database file, not the service provider.

### B. AI as a Draftsman, Not a Commander
The AI automates the *typing*, not the *deciding*. It reduces friction by pre-filling data, but it requires explicit user sign-off to alter the financial reality.

## 6. Core Capabilities (Scope v1)
1.  **Ledger Management:** Create, read, update, and delete transactions and custom categories.
2.  **AI Proposal Engine:** The system generates "ChangeSets" based on user input or text descriptions.
3.  **The Review Widget:** A dedicated UI interface where users approve or reject AI proposals with a single tap.
4.  **Draft Archives:** A searchable history of all AI proposals—accepted, pending, and rejected.

## 7. Future Horizon
While v1 is a solitary, local experience, the product foundation is built to eventually support **Multi-User Household Syncing**. The "Proposal" model designed for the AI today will evolve to handle conflicting edits between partners in the future (e.g., "User A proposes an expense, User B approves it").