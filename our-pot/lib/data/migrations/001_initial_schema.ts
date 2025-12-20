const initialSchema = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Schema Migrations Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    is_kitty BOOLEAN NOT NULL DEFAULT 0,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT unique_kitty_per_account UNIQUE (account_id, is_kitty)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    category_id TEXT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    merchant TEXT,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_model_search ON transactions(account_id, merchant, description);

-- Changesets Table
CREATE TABLE IF NOT EXISTS changesets (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT,
    description TEXT,
    tool_call_id TEXT,
    proposed_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    rejection_reason TEXT
);

-- Change Requests Table
CREATE TABLE IF NOT EXISTS change_requests (
    id TEXT PRIMARY KEY,
    changeset_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    current_data TEXT,
    proposed_data TEXT,
    execution_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (changeset_id) REFERENCES changesets(id) ON DELETE CASCADE
);

-- Triggers
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = datetime('now')
    WHERE id = NEW.account_id;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_update
AFTER UPDATE ON transactions
BEGIN
    UPDATE accounts
    SET balance = balance - OLD.amount + NEW.amount,
        updated_at = datetime('now')
    WHERE id = NEW.account_id
      AND OLD.deleted_at IS NULL
      AND NEW.deleted_at IS NULL;
      
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = datetime('now')
    WHERE id = NEW.account_id
      AND OLD.deleted_at IS NULL
      AND NEW.deleted_at IS NOT NULL;

    UPDATE accounts
    SET balance = balance + NEW.amount,
        updated_at = datetime('now')
    WHERE id = NEW.account_id
      AND OLD.deleted_at IS NOT NULL
      AND NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_delete
AFTER DELETE ON transactions
WHEN OLD.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance - OLD.amount,
        updated_at = datetime('now')
    WHERE id = OLD.account_id;
END;
`;

export default initialSchema;
