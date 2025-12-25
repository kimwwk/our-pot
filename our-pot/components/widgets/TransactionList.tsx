"use client";

import { useMemo, useState } from "react";
import { Transaction, Category, Member } from "@/lib/data/types";
import { TransactionItem } from "./TransactionItem";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils/format";
import { Receipt } from "lucide-react";
import { useCategories } from "@/lib/data/hooks/useCategories";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { TransactionSearchBar } from "@/components/features/transactions/TransactionSearchBar";

interface TransactionListProps {
    transactions: Transaction[];
    isLoading: boolean;
    onTransactionClick?: (id: string) => void;
    showSearchBar?: boolean;
    showFilters?: boolean;
}

export function TransactionList({
    transactions,
    isLoading,
    onTransactionClick,
    showSearchBar = true,
    showFilters = true
}: TransactionListProps) {
    const { categories } = useCategories();
    const { members } = useMembers();
    const { account } = useAccount();
    const [searchTerm, setSearchTerm] = useState("");

    const categoryMap = useMemo(() => {
        const map = new Map<string, Category>();
        categories.forEach(c => map.set(c.id, c));
        return map;
    }, [categories]);

    const memberMap = useMemo(() => {
        const map = new Map<string, Member>();
        members.forEach(m => map.set(m.id, m));
        return map;
    }, [members]);

    // Filter
    const filtered = useMemo(() => {
        if (!searchTerm) return transactions;
        const lower = searchTerm.toLowerCase();
        return transactions.filter(t =>
            (t.merchant && t.merchant.toLowerCase().includes(lower)) ||
            t.description.toLowerCase().includes(lower) ||
            (t.amount / 100).toString().includes(lower)
        );
    }, [transactions, searchTerm]);

    // Group by Date
    const grouped = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        filtered.forEach(t => {
            const dateKey = t.date.split('T')[0]; // Simple YYYY-MM-DD
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });
        return groups;
    }, [filtered]);

    // Sort dates desc
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (isLoading) {
        return <div className="p-4 text-center text-muted-foreground">Loading transactions...</div>;
    }

    if (transactions.length === 0) {
        return (
            <EmptyState
                icon={Receipt}
                title="No Transactions Yet"
                description="Start tracking expenses by adding your first transaction"
            />
        );
    }

    return (
        <div className="space-y-4">
            {showSearchBar && (
                <TransactionSearchBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />
            )}

            <div className="space-y-6">
                {sortedDates.map(date => (
                    <div key={date}>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                            {formatDate(date)}
                        </h3>
                        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            {grouped[date].map(t => (
                                <TransactionItem
                                    key={t.id}
                                    transaction={t}
                                    category={categoryMap.get(t.category_id || '')}
                                    member={memberMap.get(t.member_id)}
                                    currency={account?.currency || "GBP"}
                                    onClick={() => onTransactionClick?.(t.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
