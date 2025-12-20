"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { cn } from "@/lib/utils";

interface KittyBalanceCardProps {
    className?: string;
}

export function KittyBalanceCard({ className }: KittyBalanceCardProps) {
    const { account, isLoading } = useAccount();

    if (isLoading || !account) {
        return (
            <Card className={cn("w-full animate-pulse", className)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <div className="h-4 w-4 rounded-full bg-muted" />
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-32 rounded bg-muted" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("w-full", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <span className="text-2xl">💰</span>
            </CardHeader>
            <CardContent>
                <div className={cn(
                    "text-2xl font-bold",
                    account.balance < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
                )}>
                    {formatCurrency(account.balance, account.currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {account.name}
                </p>
            </CardContent>
        </Card>
    );
}
