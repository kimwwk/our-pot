"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSQLite } from "./SQLiteContext";
import { AccountRepository } from "../repositories/AccountRepository";
import { Account } from "../types";

interface AccountContextData {
    account: Account | null;
    accounts: Account[]; // All available accounts for pot switcher
    isLoading: boolean;
    switchAccount: (id: string) => Promise<void>;
    reloadAccount: () => Promise<void>;
}

const AccountContext = createContext<AccountContextData>({
    account: null,
    accounts: [],
    isLoading: true,
    switchAccount: async () => { },
    reloadAccount: async () => { },
});

export const useAccount = () => useContext(AccountContext);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { db, isInitialized } = useSQLite();
    const [account, setAccount] = useState<Account | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAccount = async (id?: string) => {
        if (!db || !isInitialized) {
            setIsLoading(false);
            return;
        }

        try {
            const repo = new AccountRepository(db);

            // Always fetch all accounts for PotSwitcher
            const all = await repo.getAll();
            setAccounts(all);

            if (id) {
                const found = await repo.getById(id);
                if (found) {
                    setAccount(found);
                    localStorage.setItem("activeAccountId", id);
                }
            } else {
                // Fetch default or first available
                const savedId = localStorage.getItem("activeAccountId");
                if (savedId) {
                    const found = await repo.getById(savedId);
                    if (found) {
                        setAccount(found);
                    } else {
                        // Saved ID invalid, fallback
                        if (all.length > 0) {
                            setAccount(all[0]);
                            localStorage.setItem("activeAccountId", all[0].id);
                        }
                    }
                } else {
                    if (all.length > 0) {
                        setAccount(all[0]);
                        localStorage.setItem("activeAccountId", all[0].id);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load account", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isInitialized) {
            fetchAccount();
        }
    }, [isInitialized, db]);

    const switchAccount = async (id: string) => {
        setIsLoading(true);
        await fetchAccount(id);
    };

    const reloadAccount = async () => {
        if (account) {
            await fetchAccount(account.id);
        } else {
            await fetchAccount();
        }
    }

    return (
        <AccountContext.Provider value={{ account, accounts, isLoading, switchAccount, reloadAccount }}>
            {children}
        </AccountContext.Provider>
    );
};
