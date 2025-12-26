"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BaseSheet } from "@/components/common/BaseSheet"
import { CurrencyInput } from "@/components/common/CurrencyInput"
import { MemberPicker } from "@/components/common/MemberPicker"
import { useCategories } from "@/lib/data/hooks/useCategories"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { cn, getTodayDateString } from "@/lib/utils"

interface AddExpenseSheetProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (expense: {
        description: string
        amount: number
        categoryId: string
        memberId: string
        date: string
    }) => void
}

export function AddExpenseSheet({ isOpen, onClose, onSubmit }: AddExpenseSheetProps) {
    const { categories } = useCategories();
    const { members } = useMembers(); // All members including kitty
    const { account } = useAccount();

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [memberId, setMemberId] = useState<string>("") // defaulting to empty, user must pick or we logic it
    const [showCategoryPicker, setShowCategoryPicker] = useState(false)

    // Helpers to get data
    const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

    // Logic for "Who Paid":
    // In v0 it was "Paid By: Kitty or Member".
    // In our DB:
    // - If paid by Kitty: member_id = kitty_member_id (is_kitty=1)
    // - If paid by Member: member_id = human_member_id
    // We need to find the "Kitty" member to simulate "Paid by Pot".
    const kittyMember = members.find(m => m.is_kitty);

    const handleSubmit = () => {
        const amountNum = parseFloat(amount);
        if (description && amountNum > 0 && selectedCategory) {
            // Default to kitty if no member selected (shouldn't happen if we default)
            const finalMemberId = memberId || kittyMember?.id;

            if (!finalMemberId) {
                console.error("No payer selected and no kitty found");
                return;
            }

            onSubmit({
                description,
                amount: amountNum,
                categoryId: selectedCategory,
                memberId: finalMemberId,
                date: getTodayDateString()
            })

            // Reset
            setDescription("")
            setAmount("")
            setSelectedCategory("")
            setMemberId("") // Will default back to kitty roughly
            onClose()
        }
    }

    // Auto-init memberId to kitty if not set
    if (!memberId && kittyMember) {
        setMemberId(kittyMember.id);
    }

    return (
        <BaseSheet isOpen={isOpen} onClose={onClose} title="Add Expense">
            <div className="px-5 pb-6 space-y-6">
                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                    </label>
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        currency={account?.currency}
                        className="border-2 text-center"
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                    </label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What was this expense for?"
                        className="h-11 border-2"
                    />
                </div>

                {/* Category Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Category
                    </label>
                    <Button
                        variant="outline"
                        className="w-full justify-between h-11 border-2 hover:bg-accent"
                        onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    >
                            {selectedCategoryData ? (
                                <span className="flex items-center gap-2">
                                    <span className="min-w-4">{selectedCategoryData.icon || '📦'}</span>
                                    {selectedCategoryData.name}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Select category</span>
                            )}
                            <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", showCategoryPicker && "rotate-180")} />
                        </Button>

                    {showCategoryPicker && (
                        <div className="grid grid-cols-3 gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategory(cat.id)
                                        setShowCategoryPicker(false)
                                    }}
                                    className={cn(
                                        "p-3 rounded-lg text-center transition-all border-2 active:scale-95",
                                        selectedCategory === cat.id
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-muted/30 hover:bg-muted border-transparent"
                                    )}
                                >
                                    <span className="text-xl block mb-1">{cat.icon || '📦'}</span>
                                    <span className="text-[10px] font-medium truncate w-full block">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Paid By Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Paid By
                    </label>
                    <MemberPicker
                        members={members}
                        selectedMemberId={memberId}
                        onSelect={setMemberId}
                        placeholder="Select payer"
                        memberSubtitle="reimburse"
                    />
                </div>

                    {/* Receipt upload button (Mock) */}
                    {/* <Button variant="outline" className="w-full h-11 rounded-lg bg-transparent text-sm border-dashed text-muted-foreground">
                        <Camera className="h-4 w-4 mr-2" />
                        Attach Receipt (optional)
                    </Button> */}

                {/* Submit */}
                <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleSubmit}
                    disabled={!description || !amount || !selectedCategory}
                >
                    Add Expense
                </Button>
            </div>
        </BaseSheet>
    )
}
