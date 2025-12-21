"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface KittyBalanceCardProps {
    className?: string;
}

export function KittyBalanceCard({ className }: KittyBalanceCardProps) {
    const { account, isLoading } = useAccount();
    const { db } = useSQLite();
    const [stats, setStats] = useState({ contributed: 0, spent: 0 });

    useEffect(() => {
        async function fetchStats() {
            if (!db || !account) return;

            try {
                const repo = new TransactionRepository(db);
                const transactions = await repo.getAllByAccount(account.id);

                const contributed = transactions
                    .filter(tx => tx.type === 'DEPOSIT')
                    .reduce((sum, tx) => sum + tx.amount, 0);

                const spent = Math.abs(transactions
                    .filter(tx => tx.type === 'EXPENSE')
                    .reduce((sum, tx) => sum + tx.amount, 0));

                setStats({ contributed, spent });
            } catch (error) {
                console.error("Failed to fetch balance stats:", error);
            }
        }

        fetchStats();
    }, [db, account]);

    if (isLoading || !account) {
        return (
            <div className={cn("w-full rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-6 animate-pulse", className)}>
                <div className="h-8 w-32 rounded bg-primary-foreground/20 mb-4" />
                <div className="h-12 w-40 rounded bg-primary-foreground/20" />
            </div>
        );
    }

    return (
        <div className={cn(
            "w-full rounded-2xl bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-lg",
            className
        )}>
            {/* Emoji */}
            <div className="text-4xl mb-2">{account.emoji}</div>

            {/* Account Name */}
            <p className="text-sm opacity-80 mb-1">{account.name}</p>

            {/* Balance */}
            <div className="text-4xl font-bold mb-4">
                {formatCurrency(account.balance, account.currency)}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm opacity-90">
                <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <p className="text-[10px] opacity-75 uppercase tracking-wide">Contributed</p>
                        <p className="font-semibold">{formatCurrency(stats.contributed, account.currency)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <p className="text-[10px] opacity-75 uppercase tracking-wide">Spent</p>
                        <p className="font-semibold">{formatCurrency(stats.spent, account.currency)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
