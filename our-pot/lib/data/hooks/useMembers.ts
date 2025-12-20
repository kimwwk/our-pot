"use client";

import { useEffect, useState, useCallback } from "react";
import { useSQLite } from "../contexts/SQLiteContext";
import { useAccount } from "../contexts/AccountContext";
import { MemberRepository } from "../repositories/MemberRepository";
import { Member } from "../types";

export function useMembers() {
    const { db } = useSQLite();
    const { account } = useAccount();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMembers = useCallback(async () => {
        if (!db || !account) return;

        try {
            setIsLoading(true);
            const repo = new MemberRepository(db);
            const data = await repo.getAllByAccount(account.id);
            setMembers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [db, account]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    return { members, isLoading, refetch: fetchMembers };
}
