import { BaseRepository } from "./BaseRepository";
import { Transaction } from "../types";

export interface TransactionFilters {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    memberId?: string;
    type?: 'EXPENSE' | 'DEPOSIT';
    limit?: number;
    offset?: number;
}

export class TransactionRepository extends BaseRepository {

    async getAllByAccount(accountId: string, filters?: TransactionFilters): Promise<Transaction[]> {
        let query = `SELECT * FROM transactions WHERE account_id = ? AND deleted_at IS NULL`;
        const params: any[] = [accountId];

        if (filters) {
            if (filters.startDate) {
                query += ` AND date >= ?`;
                params.push(filters.startDate);
            }
            if (filters.endDate) {
                query += ` AND date <= ?`;
                params.push(filters.endDate);
            }
            if (filters.categoryId) {
                query += ` AND category_id = ?`;
                params.push(filters.categoryId);
            }
            if (filters.memberId) {
                query += ` AND member_id = ?`;
                params.push(filters.memberId);
            }
            if (filters.type) {
                query += ` AND type = ?`;
                params.push(filters.type);
            }
        }

        query += ` ORDER BY date DESC, created_at DESC`;

        if (filters?.limit) {
            query += ` LIMIT ?`;
            params.push(filters.limit);

            if (filters?.offset) {
                query += ` OFFSET ?`;
                params.push(filters.offset);
            }
        }

        return this.executeQuery<Transaction>(query, params);
    }

    async getById(id: string): Promise<Transaction | null> {
        return this.executeSingle<Transaction>(
            `SELECT * FROM transactions WHERE id = ?`,
            [id]
        );
    }

    async create(transaction: Transaction): Promise<void> {
        await this.executeNonQuery(
            `INSERT INTO transactions (id, account_id, member_id, category_id, type, amount, merchant, description, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [transaction.id, transaction.account_id, transaction.member_id, transaction.category_id, transaction.type, transaction.amount, transaction.merchant, transaction.description, transaction.date, transaction.created_at, transaction.updated_at]
        );
    }

    async update(id: string, changes: Partial<Transaction>): Promise<void> {
        const fields = Object.keys(changes)
            .filter(key => key !== 'id')
            .map(key => `${key} = ?`)
            .join(', ');

        if (!fields) return;

        const values = Object.keys(changes)
            .filter(key => key !== 'id')
            .map(key => (changes as any)[key]);

        const now = new Date().toISOString();

        await this.executeNonQuery(
            `UPDATE transactions SET ${fields}, updated_at = ? WHERE id = ?`,
            [...values, now, id]
        );
    }

    async softDelete(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.executeNonQuery(
            `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?`,
            [now, now, id]
        );
    }

    async search(accountId: string, searchTerm: string): Promise<Transaction[]> {
        const term = `%${searchTerm}%`;
        return this.executeQuery<Transaction>(
            `SELECT * FROM transactions 
       WHERE account_id = ? 
       AND deleted_at IS NULL 
       AND (merchant LIKE ? OR description LIKE ?) 
       ORDER BY date DESC`,
            [accountId, term, term]
        );
    }
}
