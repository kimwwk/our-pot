"use client";

import { useState, useEffect } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { TransactionRepository } from "../repositories/TransactionRepository";

export interface MemberStats {
    contributed: number; // Total deposits by this member
    owedByKitty: number; // Total pending reimbursements
    isLoading: boolean;
}

export function useMemberStats(memberId: string | null | undefined): MemberStats {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [stats, setStats] = useState<MemberStats>({
        contributed: 0,
        owedByKitty: 0,
        isLoading: true,
    });

    useEffect(() => {
        async function fetchStats() {
            if (!db || !account || !memberId) {
                setStats({ contributed: 0, owedByKitty: 0, isLoading: false });
                return;
            }

            try {
                const repo = new TransactionRepository(db);

                // Calculate contributed (sum of DEPOSITs)
                const contributed = await repo.getContributionsByMember(memberId);

                // Calculate owed by kitty (sum of pending_reimbursement EXPENSEs)
                const owedByKitty = await repo.getOwedByMember(memberId);

                setStats({
                    contributed,
                    owedByKitty,
                    isLoading: false,
                });
            } catch (error) {
                console.error("Failed to fetch member stats:", error);
                setStats({ contributed: 0, owedByKitty: 0, isLoading: false });
            }
        }

        fetchStats();
    }, [db, account, memberId]);

    return stats;
}
