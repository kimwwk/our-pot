"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { TransactionFormData } from "@/lib/validators/transaction";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function NewTransactionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = (searchParams.get("type") as "EXPENSE" | "DEPOSIT") || "EXPENSE";

    const { db } = useSQLite();
    const { account } = useAccount();

    const handleSubmit = async (data: TransactionFormData) => {
        if (!db || !account) return;

        try {
            const repo = new TransactionRepository(db);

            // Calculate signed amount in cents
            // Expense = -ve, Deposit = +ve
            const cents = Math.round(data.amount * 100);
            const signedAmount = data.type === "EXPENSE" ? -cents : cents;

            await repo.create({
                id: generateId(),
                account_id: account.id,
                member_id: data.member_id,
                category_id: data.category_id === 'uncategorized' ? undefined : data.category_id,
                type: data.type,
                amount: signedAmount,
                merchant: data.merchant,
                description: data.description,
                date: data.date,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Transaction added successfully");
            router.push("/transactions");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save transaction");
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-md space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/transactions">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Add Transaction</h1>
            </div>

            <TransactionForm
                onSubmit={handleSubmit}
                initialData={{ type }}
            />
        </div>
    );
}

export default function NewTransactionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewTransactionContent />
        </Suspense>
    )
}
