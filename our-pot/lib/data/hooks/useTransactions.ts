"use client";

import { useEffect, useState, useCallback } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { TransactionRepository, TransactionFilters } from "../repositories/TransactionRepository";
import { Transaction } from "../types";

export function useTransactions(filters?: TransactionFilters) {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTransactions = useCallback(async () => {
        if (!db || !account) return;

        try {
            setIsLoading(true);
            const repo = new TransactionRepository(db);
            const data = await repo.getAllByAccount(account.id, filters);
            setTransactions(data);
        } catch (err: any) {
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, [db, account, JSON.stringify(filters)]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    return { transactions, isLoading, error, refetch: fetchTransactions };
}
