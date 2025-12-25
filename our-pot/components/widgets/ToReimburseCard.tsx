"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils/format";

export function ToReimburseCard() {
  const { members } = useMembers();
  const { account } = useAccount();
  const { db } = useSQLite();
  const [totalOwed, setTotalOwed] = useState(0);
  const [membersOwingCount, setMembersOwingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const humanMembers = useMemo(() => members.filter(m => !m.is_kitty), [members]);

  useEffect(() => {
    async function calculateTotalOwed() {
      if (!db || !account || humanMembers.length === 0) {
        setTotalOwed(0);
        setMembersOwingCount(0);
        setIsLoading(false);
        return;
      }

      try {
        const repo = new TransactionRepository(db);
        let total = 0;
        let count = 0;

        // Sum up all pending reimbursements for all human members
        for (const member of humanMembers) {
          const owed = await repo.getOwedByMember(member.id);
          if (owed > 0) {
            total += owed;
            count++;
          }
        }

        setTotalOwed(total);
        setMembersOwingCount(count);
      } catch (error) {
        console.error("Failed to calculate total owed:", error);
        setTotalOwed(0);
        setMembersOwingCount(0);
      } finally {
        setIsLoading(false);
      }
    }

    calculateTotalOwed();
  }, [db, account, humanMembers]);

  if (isLoading) {
    return null;
  }

  const hasAmount = totalOwed > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl p-5 border transition-colors ${
        hasAmount
          ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900"
          : "bg-muted border-border"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            hasAmount ? "bg-amber-100 dark:bg-amber-900" : "bg-muted-foreground/10"
          }`}
        >
          <AlertCircle
            className={`h-5 w-5 ${
              hasAmount ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1">
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              hasAmount ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}
          >
            To Reimburse
          </p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totalOwed, account?.currency || "GBP")}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasAmount
          ? `${membersOwingCount} member${membersOwingCount > 1 ? 's' : ''} waiting for reimbursement`
          : "No pending reimbursements"}
      </p>
    </motion.div>
  );
}
