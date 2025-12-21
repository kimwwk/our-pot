"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { ulid } from "ulid";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ContributeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ContributeSheet({ isOpen, onClose, onSuccess }: ContributeSheetProps) {
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
            const today = new Date().toISOString().split('T')[0];

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
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                <div className="flex justify-center pt-1 pb-3">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                <SheetHeader className="px-1 pb-4">
                    <SheetTitle>Add Contribution</SheetTitle>
                </SheetHeader>

                <div className="px-1 space-y-6 mt-2">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-semibold text-muted-foreground">
                                {getCurrencySymbol(account?.currency || "GBP")}
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="text-3xl h-16 pl-12 font-semibold text-center"
                                placeholder="0.00"
                                inputMode="decimal"
                            />
                        </div>
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
                        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select member" />
                            </SelectTrigger>
                            <SelectContent>
                                {humanMembers.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

                <div className="pb-6" />
            </SheetContent>
        </Sheet>
    );
}
