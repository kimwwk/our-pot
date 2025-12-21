import { BaseRepository } from "./BaseRepository";
import { ChangeSet, ChangeRequest } from "../types";

export class ChangeSetRepository extends BaseRepository {

    async create(changeset: ChangeSet, requests: ChangeRequest[]): Promise<void> {
        try {
            await this.beginTransaction();

            await this.executeNonQuery(
                `INSERT INTO changesets (id, status, source, title, description, tool_call_id, proposed_at, reviewed_at, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [changeset.id, changeset.status, changeset.source, changeset.title, changeset.description, changeset.tool_call_id, changeset.proposed_at, changeset.reviewed_at, changeset.rejection_reason]
            );

            for (const req of requests) {
                await this.executeNonQuery(
                    `INSERT INTO change_requests (id, changeset_id, operation_type, entity_type, entity_id, current_data, proposed_data, execution_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [req.id, req.changeset_id, req.operation_type, req.entity_type, req.entity_id, req.current_data, req.proposed_data, req.execution_order, req.created_at]
                );
            }

            await this.commitTransaction();
        } catch (error) {
            await this.rollbackTransaction();
            throw error;
        }
    }

    async getById(id: string): Promise<ChangeSet | null> {
        return this.executeSingle<ChangeSet>(
            `SELECT * FROM changesets WHERE id = ?`,
            [id]
        );
    }

    async getRequests(changesetId: string): Promise<ChangeRequest[]> {
        return this.executeQuery<ChangeRequest>(
            `SELECT * FROM change_requests WHERE changeset_id = ? ORDER BY execution_order ASC`,
            [changesetId]
        );
    }

    async updateStatus(id: string, status: string, reviewedAt?: string, rejectionReason?: string): Promise<void> {
        await this.executeNonQuery(
            `UPDATE changesets SET status = ?, reviewed_at = ?, rejection_reason = ? WHERE id = ?`,
            [status, reviewedAt, rejectionReason, id]
        );
    }

    async getByStatus(status: string): Promise<ChangeSet[]> {
        return this.executeQuery<ChangeSet>(
            `SELECT * FROM changesets WHERE status = ? ORDER BY proposed_at DESC`,
            [status]
        );
    }

    async getApprovedByAccount(limit: number = 20): Promise<ChangeSet[]> {
        // Audit trail mainly
        return this.executeQuery<ChangeSet>(
            `SELECT * FROM changesets WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT ?`,
            [limit]
        );
    }

    // Atomic Application of Changeset
    async applyChangeSet(id: string): Promise<void> {
        const requests = await this.getRequests(id);
        if (!requests || requests.length === 0) return;

        try {
            await this.beginTransaction();

            for (const req of requests) {
                const data = req.proposed_data ? JSON.parse(req.proposed_data) : {};

                // This is a naive implementation; 
                // In a real app, we might check if entity_type allows this operation or match repository
                // Alternatively, since this IS the repository layer, we can execute SQL directly 
                // or instantiate other repositories with the same connection.

                switch (req.operation_type) {
                    case 'create':
                        const columns = Object.keys(data).join(', ');
                        const placeholders = Object.keys(data).map(() => '?').join(', ');
                        const values = Object.values(data);
                        await this.executeNonQuery(
                            `INSERT INTO ${this.getTableName(req.entity_type)} (${columns}) VALUES (${placeholders})`,
                            values
                        );
                        break;

                    case 'update':
                        const updateFields = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
                        const updateValues = Object.keys(data).filter(k => k !== 'id').map(k => data[k]);
                        await this.executeNonQuery(
                            `UPDATE ${this.getTableName(req.entity_type)} SET ${updateFields} WHERE id = ?`,
                            [...updateValues, req.entity_id]
                        );
                        break;

                    case 'delete':
                        // Assuming physical delete or manual soft delete logic is in 'proposed_data' or we imply soft delete
                        // Let's assume soft delete for now if table supports it
                        const now = new Date().toISOString();
                        await this.executeNonQuery(
                            `UPDATE ${this.getTableName(req.entity_type)} SET deleted_at = ? WHERE id = ?`,
                            [now, req.entity_id]
                        );
                        break;
                }
            }

            await this.executeNonQuery(`UPDATE changesets SET status = 'approved' WHERE id = ?`, [id]);
            await this.commitTransaction();

        } catch (error) {
            console.error(`Failed to apply changeset ${id}`, error);
            await this.rollbackTransaction();
            await this.executeNonQuery(`UPDATE changesets SET status = 'execution_failed' WHERE id = ?`, [id]);
            throw error;
        }
    }

    private getTableName(entityType: string): string {
        switch (entityType) {
            case 'transaction': return 'transactions';
            case 'category': return 'categories';
            case 'member': return 'members';
            case 'account': return 'accounts';
            default: throw new Error(`Unknown entity type: ${entityType}`);
        }
    }
}
