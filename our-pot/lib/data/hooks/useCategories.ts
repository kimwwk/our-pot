"use client";

import { useEffect, useState, useCallback } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { Category } from "../types";

export function useCategories() {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        if (!db || !account) return;

        try {
            setIsLoading(true);
            const repo = new CategoryRepository(db);
            const data = await repo.getAllByAccount(account.id);
            setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [db, account]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return { categories, isLoading, refetch: fetchCategories };
}
