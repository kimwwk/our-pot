"use client";

import { TransactionList } from "@/components/widgets/TransactionList";
import { useTransactions } from "@/lib/data/hooks/useTransactions";
import { QuickActions } from "@/components/widgets/QuickActions";

import { useRouter } from "next/navigation";

export default function TransactionsPage() {
    const { transactions, isLoading } = useTransactions({ limit: 50 });
    const router = useRouter();

    return (
        <div className="container mx-auto p-4 space-y-6 pb-24">
            <h1 className="text-2xl font-bold">Transactions</h1>

            <QuickActions />

            <TransactionList
                transactions={transactions}
                isLoading={isLoading}
                onTransactionClick={(id) => router.push(`/transactions/edit?id=${id}`)}
            />
        </div>
    );
}
