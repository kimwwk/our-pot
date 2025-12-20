import { BaseRepository } from "./BaseRepository";
import { Account } from "../types";

export class AccountRepository extends BaseRepository {

    async getAll(): Promise<Account[]> {
        return this.executeQuery<Account>(
            `SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY created_at DESC`
        );
    }

    async getById(id: string): Promise<Account | null> {
        return this.executeSingle<Account>(
            `SELECT * FROM accounts WHERE id = ?`,
            [id]
        );
    }

    async create(account: Account): Promise<void> {
        await this.executeNonQuery(
            `INSERT INTO accounts (id, name, currency, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
            [account.id, account.name, account.currency, account.balance, account.created_at, account.updated_at]
        );
    }

    async update(id: string, changes: Partial<Account>): Promise<void> {
        const fields = Object.keys(changes)
            .filter(key => key !== 'id')
            .map(key => `${key} = ?`)
            .join(', ');

        if (!fields) return;

        const values = Object.keys(changes)
            .filter(key => key !== 'id')
            .map(key => (changes as any)[key]);

        // Always update updated_at
        const now = new Date().toISOString();

        await this.executeNonQuery(
            `UPDATE accounts SET ${fields}, updated_at = ? WHERE id = ?`,
            [...values, now, id]
        );
    }

    async softDelete(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.executeNonQuery(
            `UPDATE accounts SET deleted_at = ?, updated_at = ? WHERE id = ?`,
            [now, now, id]
        );
    }

    // Force recalculate balance from transactions
    async reconcileBalance(id: string): Promise<void> {
        await this.executeNonQuery(`
      UPDATE accounts 
      SET balance = (
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions 
        WHERE account_id = ? 
        AND deleted_at IS NULL
      ),
      updated_at = ?
      WHERE id = ?
    `, [id, new Date().toISOString(), id]);
    }
}
