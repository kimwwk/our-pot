-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'GBP',
    balance INTEGER NOT NULL DEFAULT 0,
    emoji TEXT DEFAULT '💰',
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
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
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
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

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

-- Triggers for Balance Management
CREATE TRIGGER IF NOT EXISTS update_balance_after_insert
AFTER INSERT ON transactions
WHEN NEW.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance + (
        CASE NEW.type
            WHEN 'DEPOSIT' THEN NEW.amount
            WHEN 'EXPENSE' THEN -NEW.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = NEW.account_id;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_update
AFTER UPDATE ON transactions
BEGIN
    -- Reverse old amount if transaction was active
    UPDATE accounts
    SET balance = balance - (
        CASE OLD.type
            WHEN 'DEPOSIT' THEN OLD.amount
            WHEN 'EXPENSE' THEN -OLD.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = OLD.account_id
      AND OLD.deleted_at IS NULL;

    -- Apply new amount if transaction is active
    UPDATE accounts
    SET balance = balance + (
        CASE NEW.type
            WHEN 'DEPOSIT' THEN NEW.amount
            WHEN 'EXPENSE' THEN -NEW.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = NEW.account_id
      AND NEW.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS update_balance_after_delete
AFTER DELETE ON transactions
WHEN OLD.deleted_at IS NULL
BEGIN
    UPDATE accounts
    SET balance = balance - (
        CASE OLD.type
            WHEN 'DEPOSIT' THEN OLD.amount
            WHEN 'EXPENSE' THEN -OLD.amount
        END
    ),
    updated_at = datetime('now')
    WHERE id = OLD.account_id;
END;

-- Triggers for Kitty Constraint
-- Ensure only one kitty member per account
-- Using triggers instead of partial index because SQLite's export/import doesn't preserve partial indexes
CREATE TRIGGER IF NOT EXISTS enforce_one_kitty_per_account_insert
BEFORE INSERT ON members
WHEN NEW.is_kitty = 1
BEGIN
  SELECT RAISE(ABORT, 'Only one kitty member allowed per account')
  WHERE EXISTS (
    SELECT 1 FROM members
    WHERE account_id = NEW.account_id
    AND is_kitty = 1
    AND id != NEW.id
    AND deleted_at IS NULL
  );
END;

CREATE TRIGGER IF NOT EXISTS enforce_one_kitty_per_account_update
BEFORE UPDATE ON members
WHEN NEW.is_kitty = 1
BEGIN
  SELECT RAISE(ABORT, 'Only one kitty member allowed per account')
  WHERE EXISTS (
    SELECT 1 FROM members
    WHERE account_id = NEW.account_id
    AND is_kitty = 1
    AND id != NEW.id
    AND deleted_at IS NULL
  );
END;

-- Essential Indexes
-- Only keeping indexes that provide real performance benefits at scale

-- Transactions (the only table that grows large)
CREATE INDEX IF NOT EXISTS idx_transactions_accountId ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_memberId ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Change Requests (for FK lookups)
CREATE INDEX IF NOT EXISTS idx_change_requests_changesetId ON change_requests(changeset_id);
