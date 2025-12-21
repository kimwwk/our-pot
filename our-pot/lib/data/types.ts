// Domain Models

export interface Account {
    id: string;
    name: string;
    emoji: string; // Visual identifier for pot/account
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
    email?: string; // Contact email for member
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
    amount: number; // Always positive integer in cents (e.g., 4250 = £42.50)
    merchant?: string;
    description: string;
    date: string;
    status: 'completed' | 'pending_reimbursement' | 'reimbursed'; // Reimbursement tracking
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface ChangeSet {
    id: string;
    status: 'building' | 'pending_approval' | 'approved' | 'rejected' | 'executing' | 'execution_failed';
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
    operation_type: 'create' | 'update' | 'delete';
    entity_type: 'transaction' | 'category' | 'member' | 'account';
    entity_id?: string;
    current_data?: string; // JSON
    proposed_data?: string; // JSON
    execution_order: number;
    created_at: string;
}
