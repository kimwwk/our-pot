import { BaseRepository } from "./BaseRepository";
import { Member } from "../types";

export class MemberRepository extends BaseRepository {

    async getAllByAccount(accountId: string): Promise<Member[]> {
        return this.executeQuery<Member>(
            `SELECT * FROM members WHERE account_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
            [accountId]
        );
    }

    async getHumanMembersByAccount(accountId: string): Promise<Member[]> {
        return this.executeQuery<Member>(
            `SELECT * FROM members WHERE account_id = ? AND is_kitty = 0 AND deleted_at IS NULL ORDER BY name ASC`,
            [accountId]
        );
    }

    async getKittyMember(accountId: string): Promise<Member | null> {
        return this.executeSingle<Member>(
            `SELECT * FROM members WHERE account_id = ? AND is_kitty = 1 AND deleted_at IS NULL`,
            [accountId]
        );
    }

    async getById(id: string): Promise<Member | null> {
        return this.executeSingle<Member>(
            `SELECT * FROM members WHERE id = ?`,
            [id]
        );
    }

    async create(member: Member): Promise<void> {
        await this.executeNonQuery(
            `INSERT INTO members (id, account_id, name, role, is_kitty, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [member.id, member.account_id, member.name, member.role, member.is_kitty ? 1 : 0, member.avatar_url, member.created_at, member.updated_at]
        );
    }

    async update(id: string, changes: Partial<Member>): Promise<void> {
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
            `UPDATE members SET ${fields}, updated_at = ? WHERE id = ?`,
            [...values, now, id]
        );
    }

    async softDelete(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.executeNonQuery(
            `UPDATE members SET deleted_at = ?, updated_at = ? WHERE id = ?`,
            [now, now, id]
        );
    }
}
