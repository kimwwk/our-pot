"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Transaction, Category, Member } from "@/lib/data/types";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, ShoppingBag } from "lucide-react";

interface TransactionItemProps {
    transaction: Transaction;
    category?: Category;
    member?: Member;
    onClick?: () => void;
}

export function TransactionItem({ transaction, category, member, onClick }: TransactionItemProps) {
    const isExpense = transaction.type === "EXPENSE";

    // Decide what icon to show
    // If we had dynamic icons we'd render them here, for now generic or first letter

    return (
        <div
            onClick={onClick}
            className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
        >
            <div className="flex items-center gap-3">
                {/* Avatar / Icon */}
                <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center bg-muted",
                    category?.color && `bg-[${category.color}]/10 text-[${category.color}]` // Tailwind arbitrary values might need safelisting or style prop
                )}
                    style={{ backgroundColor: category?.color ? `${category.color}20` : undefined, color: category?.color }}
                >
                    {member && !member.is_kitty ? (
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                    ) : (
                        // Category Icon fallback
                        <ShoppingBag className="h-5 w-5" />
                    )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                    <span className="font-medium text-sm">
                        {transaction.merchant || transaction.description}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {member?.name || 'Unknown'} • {formatDateTime(transaction.date)}
                    </span>
                </div>
            </div>

            {/* Amount */}
            <div className={cn(
                "font-semibold text-sm flex items-center",
                isExpense ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            )}>
                {isExpense ? "-" : "+"}
                {formatCurrency(Math.abs(transaction.amount))}
            </div>
        </div>
    );
}
