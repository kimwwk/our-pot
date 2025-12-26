"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Transaction, Category, Member } from "@/lib/data/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn, parseLocalDate } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";

interface TransactionItemProps {
    transaction: Transaction;
    category?: Category;
    member?: Member;
    currency?: string;
    onClick?: () => void;
}

export function TransactionItem({ transaction, category, member, currency = "GBP", onClick }: TransactionItemProps) {
    const isExpense = transaction.type === "EXPENSE";

    // Smart date formatting
    const formatDate = (dateString: string) => {
        const date = parseLocalDate(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
    };

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors active:scale-[0.98] transition-transform"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar / Icon */}
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    category?.icon ? "text-2xl" : "bg-muted"
                )}
                    style={{ backgroundColor: category?.color ? `${category.color}20` : undefined, color: category?.color }}
                >
                    {category?.icon ? (
                        <span>{category.icon}</span>
                    ) : member && !member.is_kitty ? (
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <ShoppingBag className="h-5 w-5" />
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm truncate">
                        {transaction.merchant || transaction.description}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">{member?.name || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatDate(transaction.date)}</span>
                    </div>
                </div>
            </div>

            {/* Amount and Status */}
            <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={cn(
                    "font-semibold text-sm",
                    isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                )}>
                    {isExpense ? "-" : "+"}
                    {formatCurrency(Math.abs(transaction.amount), currency)}
                </div>

                {/* Status Badge */}
                {transaction.status !== 'completed' && (
                    <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        transaction.status === 'pending_reimbursement'
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    )}>
                        {transaction.status === 'pending_reimbursement' ? 'Pending' : 'Reimbursed'}
                    </span>
                )}
            </div>
        </div>
    );
}
