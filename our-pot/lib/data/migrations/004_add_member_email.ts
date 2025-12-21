// Migration 004: Add email field to members table
// This enables member identification and future notifications

const schema = `
-- Add email column to members table
ALTER TABLE members ADD COLUMN email TEXT;
`;

export default schema;
