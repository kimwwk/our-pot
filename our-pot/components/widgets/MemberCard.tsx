"use client";

import { Member } from "@/lib/data/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils/format";
import { useMemberStats } from "@/lib/data/hooks/useMemberStats";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface MemberCardProps {
    member: Member;
    onClick?: () => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
    const { account } = useAccount();
    const { contributed, owedByKitty, isLoading } = useMemberStats(member.id);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(word => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onClick}
            className="flex flex-col items-center p-4 rounded-xl border bg-card hover:bg-accent transition-colors text-left w-full"
        >
            <Avatar className="h-16 w-16 mb-3">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {getInitials(member.name)}
                </AvatarFallback>
            </Avatar>

            <h3 className="font-medium text-sm truncate w-full text-center">
                {member.name}
            </h3>

            {isLoading ? (
                <p className="text-xs text-muted-foreground mt-1">Loading...</p>
            ) : (
                <>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {formatCurrency(contributed, account?.currency || "GBP")} contributed
                    </p>

                    {owedByKitty > 0 && (
                        <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 font-medium">
                            Owed {formatCurrency(owedByKitty, account?.currency || "GBP")}
                        </span>
                    )}
                </>
            )}
        </motion.button>
    );
}
