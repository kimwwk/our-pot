"use client";

import { useState, useEffect } from "react";
import { Member, Transaction } from "@/lib/data/types";
import { BaseSheet } from "@/components/common/BaseSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { useMemberStats } from "@/lib/data/hooks/useMemberStats";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { parseLocalDate } from "@/lib/utils";

interface MemberDetailSheetProps {
    member: Member | null;
    isOpen: boolean;
    onClose: () => void;
}

export function MemberDetailSheet({ member, isOpen, onClose }: MemberDetailSheetProps) {
    const { account } = useAccount();
    const { db } = useSQLite();
    const { contributed, owedByKitty, isLoading: statsLoading } = useMemberStats(member?.id);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isReimbursing, setIsReimbursing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchTransactions() {
            if (!db || !account || !member) return;

            setLoading(true);
            try {
                const repo = new TransactionRepository(db);
                const memberTransactions = await repo.getAllByAccount(account.id, {
                    memberId: member.id
                });
                setTransactions(memberTransactions);
            } catch (error) {
                console.error("Failed to fetch member transactions:", error);
            } finally {
                setLoading(false);
            }
        }

        if (isOpen) {
            fetchTransactions();
        }
    }, [db, account, member, isOpen]);

    const handleReimburse = async () => {
        if (!db || !member || owedByKitty === 0) return;

        setIsReimbursing(true);
        try {
            const repo = new TransactionRepository(db);

            // Get all pending reimbursement transactions
            const pendingTransactions = await repo.getPendingReimbursementsByMember(member.id);

            // Update all to 'reimbursed' status
            await Promise.all(
                pendingTransactions.map(tx =>
                    repo.updateStatus(tx.id, 'reimbursed')
                )
            );

            toast.success(`Reimbursed ${formatCurrency(owedByKitty, account?.currency || "GBP")} to ${member.name}`);

            // Refresh transactions
            const updatedTransactions = await repo.getAllByAccount(account!.id, {
                memberId: member.id
            });
            setTransactions(updatedTransactions);

        } catch (error) {
            console.error("Failed to reimburse member:", error);
            toast.error("Failed to process reimbursement");
        } finally {
            setIsReimbursing(false);
        }
    };

    if (!member) return null;

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

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
        <BaseSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Member Details"
            contentClassName="px-1 space-y-6 mt-2 pb-6 overflow-y-auto"
        >
                    {/* Member Header */}
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-3">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                                {getInitials(member.name)}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-semibold">{member.name}</h2>
                        {member.email && (
                            <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                        )}
                    </div>

                    {/* Stats Cards */}
                    {statsLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-xl border bg-card">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                    Contributed
                                </p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(contributed, account?.currency || "GBP")}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-card">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                                    Owed by Kitty
                                </p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {formatCurrency(owedByKitty, account?.currency || "GBP")}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Reimburse Button */}
                    {owedByKitty > 0 && (
                        <Button
                            onClick={handleReimburse}
                            disabled={isReimbursing}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isReimbursing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Reimbursing...
                                </>
                            ) : (
                                `Reimburse ${formatCurrency(owedByKitty, account?.currency || "GBP")}`
                            )}
                        </Button>
                    )}

                    {/* Payment History */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Payment History</h3>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No transactions yet
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">
                                                {transaction.merchant || transaction.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(transaction.date)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {transaction.status !== 'completed' && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${transaction.status === 'pending_reimbursement'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                    }`}>
                                                    {transaction.status === 'pending_reimbursement'
                                                        ? 'Pending'
                                                        : 'Reimbursed'}
                                                </span>
                                            )}

                                            <p className={`font-semibold text-sm ${transaction.type === 'EXPENSE'
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : 'text-green-600 dark:text-green-400'
                                                }`}>
                                                {transaction.type === 'EXPENSE' ? '-' : '+'}
                                                {formatCurrency(transaction.amount, account?.currency || "GBP")}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
        </BaseSheet>
    );
}
