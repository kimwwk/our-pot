"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { formatCurrency } from "@/lib/utils/format";
import { useMembers } from "@/lib/data/hooks/useMembers";

export function PotSwitcher() {
    const { account, accounts, switchAccount } = useAccount();
    const { members } = useMembers();
    const [isOpen, setIsOpen] = useState(false);

    if (!account) return null;

    const handlePotChange = async (id: string) => {
        await switchAccount(id);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2.5 rounded-xl bg-secondary/80 px-3.5 py-2.5 hover:bg-secondary transition-colors"
            >
                <span className="text-base">{account.emoji}</span>
                <span className="font-medium text-foreground text-sm max-w-[140px] truncate">
                    {account.name}
                </span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown menu */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-lg shadow-foreground/5 z-50 overflow-hidden"
                        >
                            <div className="p-1.5">
                                <p className="text-[11px] font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
                                    Switch Pot
                                </p>

                                {accounts.map((pot) => {
                                    // Count members for this pot (would need to filter by account_id)
                                    const memberCount = members.filter(m => m.account_id === pot.id).length;

                                    return (
                                        <button
                                            key={pot.id}
                                            onClick={() => handlePotChange(pot.id)}
                                            className={`flex items-center gap-3 w-full rounded-lg p-3 transition-colors ${
                                                pot.id === account.id
                                                    ? "bg-accent text-foreground"
                                                    : "hover:bg-muted"
                                            }`}
                                        >
                                            <span className="text-lg">{pot.emoji}</span>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-sm">{pot.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(pot.balance, pot.currency)} · {memberCount} members
                                                </p>
                                            </div>
                                            {pot.id === account.id && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="border-t border-border p-1.5">
                                <button
                                    onClick={() => {
                                        // TODO: Implement create new pot dialog
                                        console.log("Create new pot - to be implemented");
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-3 w-full rounded-lg p-3 hover:bg-muted transition-colors text-muted-foreground"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-muted-foreground/40">
                                        <Plus className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-sm font-medium">Create New Pot</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
