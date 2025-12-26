"use client";

import { useState } from "react";
import { BaseSheet } from "@/components/common/BaseSheet";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { MemberPicker } from "@/components/common/MemberPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { ulid } from "ulid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getTodayDateString } from "@/lib/utils";

interface AddContributeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddContributeSheet({ isOpen, onClose, onSuccess }: AddContributeSheetProps) {
    const { members } = useMembers();
    const { account, reloadAccount } = useAccount();
    const { db } = useSQLite();
    const [amount, setAmount] = useState("");
    const [selectedMemberId, setSelectedMemberId] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const humanMembers = members.filter(m => !m.is_kitty);

    const quickAmounts = [50, 100, 200, 500];

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString());
    };

    const handleSubmit = async () => {
        if (!db || !account || !amount || !selectedMemberId) {
            toast.error("Please fill in all fields");
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsSubmitting(true);
        try {
            const repo = new TransactionRepository(db);
            const now = new Date().toISOString();
            const today = getTodayDateString();

            // Convert amount to cents
            const amountInCents = Math.round(amountNum * 100);

            const selectedMember = members.find(m => m.id === selectedMemberId);

            await repo.create({
                id: ulid(),
                account_id: account.id,
                member_id: selectedMemberId,
                category_id: undefined,
                type: "DEPOSIT",
                amount: amountInCents,
                merchant: undefined,
                description: `Contribution from ${selectedMember?.name || 'member'}`,
                date: today,
                status: "completed",
                created_at: now,
                updated_at: now,
            });

            toast.success(`Added ${account.currency} ${amountNum.toFixed(2)} contribution`);
            await reloadAccount();
            onSuccess?.();

            // Reset form
            setAmount("");
            setSelectedMemberId("");
            onClose();
        } catch (error) {
            console.error("Failed to add contribution:", error);
            toast.error("Failed to add contribution");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
            GBP: "£",
            USD: "$",
            EUR: "€",
        };
        return symbols[currency] || currency;
    };

    return (
        <BaseSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Add Contribution"
        >
            <div className="px-5 pb-6 space-y-6">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <CurrencyInput
                            value={amount}
                            onChange={setAmount}
                            currency={account?.currency || "GBP"}
                            size="large"
                            className="text-center"
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {quickAmounts.map((value) => (
                            <Button
                                key={value}
                                variant="outline"
                                onClick={() => handleQuickAmount(value)}
                                className="h-12"
                            >
                                {getCurrencySymbol(account?.currency || "GBP")}{value}
                            </Button>
                        ))}
                    </div>

                    {/* Member Selector */}
                    <div className="space-y-2">
                        <Label>Who is contributing?</Label>
                        {humanMembers.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                There is no member. Please add in the setting.
                            </p>
                        )}
                        <MemberPicker
                            members={humanMembers}
                            selectedMemberId={selectedMemberId}
                            onSelect={setSelectedMemberId}
                            placeholder="Select member"
                            memberSubtitle=""
                        />
                    </div>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    disabled={!amount || !selectedMemberId || isSubmitting}
                    className="w-full h-12 text-base"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                        </>
                    ) : (
                        `Add ${amount ? getCurrencySymbol(account?.currency || "GBP") + amount : ""} to Kitty`
                    )}
                </Button>
            </div>
        </BaseSheet>
    );
}
