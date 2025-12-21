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

    // Create Default Account with emoji
    await db.run(
        'INSERT INTO accounts (id, name, emoji, currency, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [accountId, 'Our Pot', '🏠', 'CAD', 0, now, now]
    );

    // Create Kitty Member
    await db.run(
        'INSERT INTO members (id, account_id, name, role, is_kitty, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [kittyId, accountId, 'The Pot', 'owner', 1, null, now, now]
    );

    // // Create Sample Human Members
    // const member1Id = ulid();
    // const member2Id = ulid();

    // await db.run(
    //     'INSERT INTO members (id, account_id, name, role, is_kitty, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    //     [member1Id, accountId, 'Alice', 'owner', 0, 'alice@example.com', now, now]
    // );

    // await db.run(
    //     'INSERT INTO members (id, account_id, name, role, is_kitty, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    //     [member2Id, accountId, 'Bob', 'member', 0, 'bob@example.com', now, now]
    // );

    // Create Default Categories
    const categories = [
        { name: 'Groceries', icon: '🛒', color: '#10B981' }, // Emerald
        { name: 'Transport', icon: '🚆', color: '#3B82F6' }, // Blue
        { name: 'Rent', icon: '🏠', color: '#F59E0B' }, // Amber
        { name: 'Entertainment', icon: '🎭', color: '#EC4899' }, // Pink
        { name: 'Utilities', icon: '⚡', color: '#6366F1' }, // Indigo
        { name: 'Dining Out', icon: '🍽️', color: '#F43F5E' }, // Rose
    ];

    const categoryIds: Record<string, string> = {};
    for (const cat of categories) {
        const catId = ulid();
        categoryIds[cat.name] = catId;
        await db.run(
            'INSERT INTO categories (id, account_id, name, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [catId, accountId, cat.name, cat.icon, cat.color, now, now]
        );
    }

    // // Create Sample Transactions
    // const today = new Date().toISOString().split('T')[0];
    // const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    // const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    // // Transaction 1: Completed expense from kitty
    // await db.run(
    //     'INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //     [ulid(), accountId, kittyId, categoryIds['Groceries'], 'EXPENSE', 4250, 'Weekly groceries', today, 'completed', now, now]
    // );

    // // Transaction 2: Pending reimbursement - Alice paid
    // await db.run(
    //     'INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, merchant, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //     [ulid(), accountId, member1Id, categoryIds['Transport'], 'EXPENSE', 1500, 'Train Station', 'Train tickets for everyone', yesterday, 'pending_reimbursement', now, now]
    // );

    // // Transaction 3: Deposit from Bob
    // await db.run(
    //     'INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //     [ulid(), accountId, member2Id, null, 'DEPOSIT', 10000, 'Monthly contribution', twoDaysAgo, 'completed', now, now]
    // );

    // // Transaction 4: Pending reimbursement - Bob paid
    // await db.run(
    //     'INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, merchant, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //     [ulid(), accountId, member2Id, categoryIds['Utilities'], 'EXPENSE', 8500, 'Electric Company', 'Electricity bill', twoDaysAgo, 'pending_reimbursement', now, now]
    // );

    // // Transaction 5: Reimbursed - Alice was paid back
    // await db.run(
    //     'INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, merchant, description, date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    //     [ulid(), accountId, member1Id, categoryIds['Dining Out'], 'EXPENSE', 3200, 'Pizza Place', 'Team dinner', twoDaysAgo, 'reimbursed', now, now]
    // );

    console.log('Seed complete with default data only');
}
