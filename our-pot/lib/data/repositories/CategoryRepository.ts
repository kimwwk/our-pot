import { BaseRepository } from "./BaseRepository";
import { Category } from "../types";

export class CategoryRepository extends BaseRepository {

    async getAllByAccount(accountId: string): Promise<Category[]> {
        return this.executeQuery<Category>(
            `SELECT * FROM categories WHERE account_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [accountId]
        );
    }

    async getById(id: string): Promise<Category | null> {
        return this.executeSingle<Category>(
            `SELECT * FROM categories WHERE id = ?`,
            [id]
        );
    }

    async create(category: Category): Promise<void> {
        await this.executeNonQuery(
            `INSERT INTO categories (id, account_id, name, icon, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category.id, category.account_id, category.name, category.icon, category.color, category.created_at, category.updated_at]
        );
    }

    async update(id: string, changes: Partial<Category>): Promise<void> {
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
            `UPDATE categories SET ${fields}, updated_at = ? WHERE id = ?`,
            [...values, now, id]
        );
    }

    async softDelete(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.executeNonQuery(
            `UPDATE categories SET deleted_at = ?, updated_at = ? WHERE id = ?`,
            [now, now, id]
        );
    }
}
