// Migration 003: Add emoji field to accounts table
// This enables visual identification of different pots/accounts

const schema = `
-- Add emoji column to accounts table
ALTER TABLE accounts ADD COLUMN emoji TEXT DEFAULT '💰';
`;

export default schema;
