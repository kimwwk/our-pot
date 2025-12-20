// Domain Models

export interface Account {
    id: string;
    name: string;
    currency: string;
    balance: number; // in cents
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface Member {
    id: string;
    account_id: string;
    name: string;
    role: 'owner' | 'member';
    is_kitty: boolean | 0 | 1; // SQLite boolean is 0/1
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface Category {
    id: string;
    account_id: string;
    name: string;
    icon?: string;
    color?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface Transaction {
    id: string;
    account_id: string;
    member_id: string;
    category_id?: string;
    type: 'EXPENSE' | 'DEPOSIT';
    amount: number; // Signed integer (relative to pot)
    merchant?: string;
    description: string;
    date: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface ChangeSet {
    id: string;
    status: 'building' | 'pending_approval' | 'approved' | 'rejected' | 'executed' | 'failed';
    source: 'ai' | 'manual';
    title?: string;
    description?: string;
    tool_call_id?: string;
    proposed_at: string;
    reviewed_at?: string;
    rejection_reason?: string;
}

export interface ChangeRequest {
    id: string;
    changeset_id: string;
    operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity_type: 'TRANSACTION' | 'CATEGORY' | 'MEMBER';
    entity_id?: string;
    current_data?: string; // JSON
    proposed_data?: string; // JSON
    execution_order: number;
    created_at: string;
}
