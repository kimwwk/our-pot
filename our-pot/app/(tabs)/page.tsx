"use client";

import { useState, useMemo } from "react";
import { KittyBalanceCard } from "@/components/widgets/KittyBalanceCard";
import { ToReimburseCard } from "@/components/widgets/ToReimburseCard";
import { QuickActions } from "@/components/widgets/QuickActions";
import { AddExpenseSheet } from "@/components/sheets/AddExpenseSheet";
import { ContributeSheet } from "@/components/sheets/ContributeSheet";
import { EditExpenseSheet } from "@/components/sheets/EditExpenseSheet";
import { EditContributionSheet } from "@/components/sheets/EditContributionSheet";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { MemberRepository } from "@/lib/data/repositories/MemberRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import { TransactionList } from "@/components/widgets/TransactionList";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showContribute, setShowContribute] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const { db } = useSQLite();
    const { account, reloadAccount } = useAccount();
    const { transactions, isLoading, refetch } = useTransactions({ limit: 5 });
    const router = useRouter();

    // Find the transaction type for editing
    const editingTransaction = useMemo(() => {
        if (!editingTransactionId) return null;
        return transactions.find(t => t.id === editingTransactionId);
    }, [editingTransactionId, transactions]);

    const handleAddExpense = async (data: any) => {
        if (!db || !account) return;

        try {
            const transactionRepo = new TransactionRepository(db);
            const memberRepo = new MemberRepository(db);

            // Amount is coming in as float e.g 10.50
            const cents = Math.round(data.amount * 100);

            // Check if member is kitty to determine status
            const member = await memberRepo.getById(data.memberId);
            const status = member?.is_kitty ? 'completed' : 'pending_reimbursement';

            await transactionRepo.create({
                id: generateId(),
                account_id: account.id,
                member_id: data.memberId,
                category_id: data.categoryId,
                type: "EXPENSE",
                // Store as positive, trigger will handle sign
                amount: Math.abs(cents),
                description: data.description,
                date: data.date,
                status: status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Expense added");
            await reloadAccount();
            refetch(); // Refresh list
        } catch (err) {
            console.error(err);
            toast.error("Failed to add expense");
        }
    };

    const handleTransactionUpdated = () => {
        reloadAccount();
        refetch();
    };

    return (
        <div className="container mx-auto p-4 pt-[calc(env(safe-area-inset-top)+1rem)] space-y-6 pb-24">
            <KittyBalanceCard />

            <QuickActions
                onAddExpense={() => setShowAddExpense(true)}
                onContribute={() => setShowContribute(true)}
                onAskAgent={() => router.push('/agent')}
            />

            <ToReimburseCard />

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <button onClick={() => router.push('/transactions')} className="text-sm text-primary">View All</button>
                </div>
                <TransactionList
                    transactions={transactions.slice(0, 5)}
                    isLoading={isLoading}
                    onTransactionClick={(id) => setEditingTransactionId(id)}
                    showSearchBar={false}
                    showFilters={false}
                />
            </div>

            <AddExpenseSheet
                isOpen={showAddExpense}
                onClose={() => setShowAddExpense(false)}
                onSubmit={handleAddExpense}
            />

            <ContributeSheet
                isOpen={showContribute}
                onClose={() => setShowContribute(false)}
            />

            {/* Show appropriate edit sheet based on transaction type */}
            {editingTransaction?.type === "EXPENSE" && (
                <EditExpenseSheet
                    transactionId={editingTransactionId}
                    isOpen={!!editingTransactionId}
                    onClose={() => setEditingTransactionId(null)}
                    onSuccess={handleTransactionUpdated}
                />
            )}

            {editingTransaction?.type === "DEPOSIT" && (
                <EditContributionSheet
                    transactionId={editingTransactionId}
                    isOpen={!!editingTransactionId}
                    onClose={() => setEditingTransactionId(null)}
                    onSuccess={handleTransactionUpdated}
                />
            )}
        </div>
    );
}
