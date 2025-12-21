import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { ulid } from 'ulid';

export async function seedData(db: SQLiteDBConnection) {
    console.log('Checking seed data...');

    // Check if any accounts exist
    const accountsResult = await db.query('SELECT COUNT(*) as count FROM accounts');
    const count = accountsResult.values?.[0]?.count || 0;

    if (count > 0) {
        console.log('Data already exists, skipping seed');
        return;
    }

    console.log('Seeding initial data...');

    const accountId = ulid();
    const kittyId = ulid();
    const now = new Date().toISOString();

    // Create Default Account
    await db.run(
        'INSERT INTO accounts (id, name, currency, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [accountId, 'Our Pot (Default)', 'GBP', 0, now, now]
    );

    // Create Kitty Member
    await db.run(
        'INSERT INTO members (id, account_id, name, role, is_kitty, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [kittyId, accountId, 'The Pot', 'owner', 1, now, now]
    );

    // Create Default Categories
    const categories = [
        { name: 'Groceries', icon: '🛒', color: '#10B981' }, // Emerald
        { name: 'Transport', icon: '🚆', color: '#3B82F6' }, // Blue
        { name: 'Rent', icon: '🏠', color: '#F59E0B' }, // Amber
        { name: 'Entertainment', icon: '🎭', color: '#EC4899' }, // Pink
        { name: 'Utilities', icon: '⚡', color: '#6366F1' }, // Indigo
        { name: 'Dining Out', icon: '🍽️', color: '#F43F5E' }, // Rose
    ];

    for (const cat of categories) {
        await db.run(
            'INSERT INTO categories (id, account_id, name, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [ulid(), accountId, cat.name, cat.icon, cat.color, now, now]
        );
    }

    console.log('Seed complete');
}
