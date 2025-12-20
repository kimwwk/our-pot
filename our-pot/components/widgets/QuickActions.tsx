"use client";

import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
    return (
        <div className="grid grid-cols-2 gap-4">
            <Button asChild className="h-14" variant="default">
                <Link href="/transactions/new?type=EXPENSE">
                    <ArrowUpRight className="mr-2 h-5 w-5" />
                    Add Expense
                </Link>
            </Button>
            <Button asChild className="h-14" variant="outline">
                <Link href="/transactions/new?type=DEPOSIT">
                    <ArrowDownLeft className="mr-2 h-5 w-5" />
                    Add Deposit
                </Link>
            </Button>
        </div>
    );
}
