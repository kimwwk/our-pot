"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
    onAddExpense?: () => void;
    onAddDeposit?: () => void;
}

export function QuickActions({ onAddExpense, onAddDeposit }: QuickActionsProps) {
    return (
        <div className="grid grid-cols-2 gap-4">
            {onAddExpense ? (
                <Button onClick={onAddExpense} className="h-14" variant="default">
                    <ArrowUpRight className="mr-2 h-5 w-5" />
                    Add Expense
                </Button>
            ) : (
                <Button asChild className="h-14" variant="default">
                    <Link href="/transactions/new?type=EXPENSE">
                        <ArrowUpRight className="mr-2 h-5 w-5" />
                        Add Expense
                    </Link>
                </Button>
            )}

            {onAddDeposit ? (
                <Button onClick={onAddDeposit} className="h-14" variant="outline">
                    <ArrowDownLeft className="mr-2 h-5 w-5" />
                    Add Deposit
                </Button>
            ) : (
                <Button asChild className="h-14" variant="outline">
                    <Link href="/transactions/new?type=DEPOSIT">
                        <ArrowDownLeft className="mr-2 h-5 w-5" />
                        Add Deposit
                    </Link>
                </Button>
            )}
        </div>
    );
}
