"use client";

import { useState, useMemo } from "react";
import { TransactionList } from "@/components/widgets/TransactionList";
import { MonthSlider } from "@/components/features/transactions/MonthSlider";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
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

export default function TransactionsPage() {
    const { transactions, isLoading, refetch } = useTransactions({ limit: 200 });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const { db } = useSQLite();
    const { account, reloadAccount } = useAccount();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showContribute, setShowContribute] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

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
            refetch();
        } catch (err) {
            console.error(err);
            toast.error("Failed to add expense");
        }
    };

    const handleTransactionUpdated = () => {
        reloadAccount();
        refetch();
    };

    // Filter transactions by selected month
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return (
                transactionDate.getFullYear() === selectedMonth.getFullYear() &&
                transactionDate.getMonth() === selectedMonth.getMonth()
            );
        });
    }, [transactions, selectedMonth]);

    return (
        <div className="container mx-auto p-4 space-y-6 pb-24">
            <MonthSlider
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
            />

            <TransactionList
                transactions={filteredTransactions}
                isLoading={isLoading}
                onTransactionClick={(id) => setEditingTransactionId(id)}
            />

            <AddExpenseSheet
                isOpen={showAddExpense}
                onClose={() => setShowAddExpense(false)}
                onSubmit={handleAddExpense}
            />

            <ContributeSheet
                isOpen={showContribute}
                onClose={() => setShowContribute(false)}
                onSuccess={handleTransactionUpdated}
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
