"use client";

import { useState, useMemo } from "react";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useMemberStats } from "@/lib/data/hooks/useMemberStats";
import { MemberDetailSheet } from "@/components/sheets/MemberDetailSheet";
import { Member } from "@/lib/data/types";
import { Loader2, Plus, ArrowUpRight, AlertCircle, Mail, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils/format";
import { useRouter } from "next/navigation";

export default function MembersPage() {
    const { members, isLoading } = useMembers();
    const { account } = useAccount();
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const router = useRouter();

    // Filter out kitty member
    const humanMembers = members.filter(m => !m.is_kitty);

    // Calculate totals
    const totals = useMemo(() => {
        // This will be calculated from all members' stats
        return {
            totalContributed: 0,
            totalOwed: 0
        };
    }, [humanMembers]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="pt-[calc(env(safe-area-inset-top)+1rem)] space-y-6 pb-24 px-4">
            {/* Header */}
            <div className="flex items-center justify-end">
                <Button
                    size="sm"
                    className="rounded-lg h-9 px-3 text-xs"
                    onClick={() => router.push("/settings")}
                >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Member
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
                            Contributed
                        </span>
                    </div>
                    <p className="text-xl font-semibold">
                        {formatCurrency(totals.totalContributed, account?.currency || "GBP")}
                    </p>
                </div>
                <div className={`rounded-xl p-4 ${totals.totalOwed > 0 ? "bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900" : "bg-muted border border-border"}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className={`h-3.5 w-3.5 ${totals.totalOwed > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
                        <span className={`text-[10px] font-medium uppercase tracking-wider ${totals.totalOwed > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            To Reimburse
                        </span>
                    </div>
                    <p className="text-xl font-semibold">
                        {formatCurrency(totals.totalOwed, account?.currency || "GBP")}
                    </p>
                </div>
            </div>

            {/* Members List */}
            {humanMembers.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">No members yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Click "Add Member" to invite people
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {humanMembers.map((member) => (
                        <MemberRow
                            key={member.id}
                            member={member}
                            onClick={() => setSelectedMember(member)}
                        />
                    ))}
                </div>
            )}

            <MemberDetailSheet
                member={selectedMember}
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
            />
        </div>
    );
}

function MemberRow({ member, onClick }: { member: Member; onClick: () => void }) {
    const { account } = useAccount();
    const { contributed, owedByKitty, isLoading } = useMemberStats(member.id);

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase();
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 rounded-xl bg-card p-4 border border-border hover:bg-accent hover:border-border/80 transition-all active:scale-[0.99]"
        >
            <Avatar className="h-11 w-11 border border-border shrink-0">
                <AvatarImage src={member.avatar_url} />
                <AvatarFallback className="text-sm bg-muted">
                    {getInitials(member.name)}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm">{member.name}</p>
                {member.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{member.email}</span>
                    </div>
                )}
                {!isLoading && (
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground">
                            Contributed <span className="text-foreground font-medium">{formatCurrency(contributed, account?.currency || "GBP")}</span>
                        </span>
                        {owedByKitty > 0 && (
                            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-md">
                                Owed {formatCurrency(owedByKitty, account?.currency || "GBP")}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </button>
    );
}
