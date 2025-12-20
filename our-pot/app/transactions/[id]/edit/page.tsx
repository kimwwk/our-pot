"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { TransactionFormData } from "@/lib/validators/transaction";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { Transaction } from "@/lib/data/types";

export default function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { db } = useSQLite();
    const { account } = useAccount();

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!db) return;

        const fetchTx = async () => {
            try {
                const repo = new TransactionRepository(db);
                const data = await repo.getById(id);
                if (data) {
                    setTransaction(data);
                } else {
                    toast.error("Transaction not found");
                    router.push("/transactions");
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load transaction");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTx();
    }, [db, id, router]);

    const handleSubmit = async (data: TransactionFormData) => {
        if (!db || !account || !transaction) return;

        try {
            const repo = new TransactionRepository(db);

            const cents = Math.round(data.amount * 100);
            const signedAmount = data.type === "EXPENSE" ? -cents : cents;

            await repo.update(transaction.id, {
                member_id: data.member_id,
                category_id: data.category_id === 'uncategorized' ? undefined : data.category_id,
                type: data.type,
                amount: signedAmount,
                merchant: data.merchant,
                description: data.description,
                date: data.date,
            });

            toast.success("Transaction updated");
            router.push("/transactions");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update transaction");
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this transaction?") || !db) return;

        try {
            const repo = new TransactionRepository(db);
            await repo.softDelete(id);
            toast.success("Transaction deleted");
            router.push("/transactions");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete");
        }
    }

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!transaction) return null;

    // Convert Transaction to FormData
    const initialData: Partial<TransactionFormData> = {
        amount: Math.abs(transaction.amount / 100),
        type: transaction.type,
        description: transaction.description,
        merchant: transaction.merchant,
        date: transaction.date.split('T')[0],
        category_id: transaction.category_id || "uncategorized",
        member_id: transaction.member_id
    };

    return (
        <div className="container mx-auto p-4 max-w-md space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/transactions">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-xl font-bold">Edit Transaction</h1>
                </div>

                <Button variant="destructive" size="icon" onClick={handleDelete}>
                    <Trash2 className="h-5 w-5" />
                </Button>
            </div>

            <TransactionForm
                onSubmit={handleSubmit}
                initialData={initialData}
            />
        </div>
    );
}
