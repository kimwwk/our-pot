"use client";

import { useState } from "react";
import { KittyBalanceCard } from "@/components/widgets/KittyBalanceCard";
import { QuickActions } from "@/components/widgets/QuickActions";
import { AddExpenseSheet } from "@/components/sheets/AddExpenseSheet";
import { CategoriesSection } from "@/components/widgets/CategoriesSection";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import { TransactionList } from "@/components/widgets/TransactionList";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const [showAddExpense, setShowAddExpense] = useState(false);
    const { db } = useSQLite();
    const { account } = useAccount();
    const { transactions, isLoading, refetch } = useTransactions();
    const router = useRouter();

    const handleAddExpense = async (data: any) => {
        if (!db || !account) return;

        try {
            const repo = new TransactionRepository(db);
            // Amount is coming in as float e.g 10.50
            const cents = Math.round(data.amount * 100);

            await repo.create({
                id: generateId(),
                account_id: account.id,
                member_id: data.memberId,
                category_id: data.categoryId,
                type: "EXPENSE",
                // Expenses are negative
                amount: -Math.abs(cents),
                description: data.description,
                date: data.date,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Expense added");
            refetch(); // Refresh list
        } catch (err) {
            console.error(err);
            toast.error("Failed to add expense");
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-6 pb-24">
            <h1 className="text-2xl font-bold">Our Pot</h1>

            <KittyBalanceCard />

            <QuickActions
                onAddExpense={() => setShowAddExpense(true)}
            />

            <CategoriesSection />

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                    <button onClick={() => router.push('/transactions')} className="text-sm text-primary">View All</button>
                </div>
                <TransactionList
                    transactions={transactions.slice(0, 5)}
                    isLoading={isLoading}
                />
            </div>

            <AddExpenseSheet
                isOpen={showAddExpense}
                onClose={() => setShowAddExpense(false)}
                onSubmit={handleAddExpense}
            />
        </div>
    );
}
