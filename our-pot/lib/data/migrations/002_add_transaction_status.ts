// Migration 002: Add status field to transactions table
// This enables reimbursement tracking for member-paid expenses

const schema = `
-- Add status column to transactions table
ALTER TABLE transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';

-- Create index for status queries (optimize filtering by status)
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
`;

export default schema;
