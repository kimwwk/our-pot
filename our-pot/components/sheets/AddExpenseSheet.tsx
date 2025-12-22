"use client"

import { useState } from "react"
import { Camera, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BaseSheet } from "@/components/common/base-sheet"
import { CurrencyInput } from "@/components/common/currency-input"
import { useCategories } from "@/lib/data/hooks/useCategories"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { cn } from "@/lib/utils"

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
    const [amountInCents, setAmountInCents] = useState(0)
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [memberId, setMemberId] = useState<string>("") // defaulting to empty, user must pick or we logic it
    const [showCategoryPicker, setShowCategoryPicker] = useState(false)
    const [showPayerPicker, setShowPayerPicker] = useState(false)

    // Helpers to get data
    const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

    // Logic for "Who Paid":
    // In v0 it was "Paid By: Kitty or Member". 
    // In our DB:
    // - If paid by Kitty: member_id = kitty_member_id (is_kitty=1)
    // - If paid by Member: member_id = human_member_id
    // We need to find the "Kitty" member to simulate "Paid by Pot".
    const kittyMember = members.find(m => m.is_kitty);
    const humanMembers = members.filter(m => !m.is_kitty);

    // Current selection display
    const currentPayer = members.find(m => m.id === memberId) || kittyMember;
    const isKitty = currentPayer?.is_kitty;

    const handleSubmit = () => {
        if (description && amountInCents > 0 && selectedCategory) {
            // Default to kitty if no member selected (shouldn't happen if we default)
            const finalMemberId = memberId || kittyMember?.id;

            if (!finalMemberId) {
                console.error("No payer selected and no kitty found");
                return;
            }

            onSubmit({
                description,
                amount: amountInCents / 100, // Convert cents back to decimal for repository
                categoryId: selectedCategory,
                memberId: finalMemberId,
                date: new Date().toISOString().split('T')[0]
            })

            // Reset
            setDescription("")
            setAmountInCents(0)
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
            {/* Amount input */}
            <CurrencyInput
                value={amountInCents}
                onChange={setAmountInCents}
                currency={account?.currency}
            />

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                            Description
                        </label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What was this expense for?"
                            className="rounded-lg h-11 text-sm bg-muted/30"
                        />
                    </div>

                    {/* Category selector */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                            Category
                        </label>
                        <Button
                            variant="outline"
                            className="w-full justify-between h-11 rounded-lg bg-transparent text-sm border-input hover:bg-muted/30"
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
                                            "p-3 rounded-lg text-center transition-all border active:scale-95",
                                            selectedCategory === cat.id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/30 hover:bg-muted/50 border-transparent"
                                        )}
                                    >
                                        <span className="text-xl block mb-1">{cat.icon || '📦'}</span>
                                        <span className="text-[10px] font-medium truncate w-full block">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Paid by selector */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                            Paid By
                        </label>
                        <Button
                            variant="outline"
                            className="w-full justify-between h-11 rounded-lg bg-transparent text-sm border-input hover:bg-muted/30"
                            onClick={() => setShowPayerPicker(!showPayerPicker)}
                        >
                            {isKitty ? (
                                <span className="flex items-center gap-2 text-primary font-medium">
                                    The Pot (Kitty)
                                </span>
                            ) : currentPayer ? (
                                <span className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={currentPayer.avatar_url} />
                                        <AvatarFallback className="text-[8px]">{currentPayer.name[0]}</AvatarFallback>
                                    </Avatar>
                                    {currentPayer.name}
                                    <span className="text-[10px] text-amber-600 ml-1">(will reimburse)</span>
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Select payer</span>
                            )}
                            <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", showPayerPicker && "rotate-180")} />
                        </Button>

                        {showPayerPicker && (
                            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Kitty Option */}
                                {kittyMember && (
                                    <button
                                        onClick={() => {
                                            setMemberId(kittyMember.id)
                                            setShowPayerPicker(false)
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-lg flex items-center gap-3 transition-all border active:scale-[0.98]",
                                            isKitty ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted/50 border-transparent"
                                        )}
                                    >
                                        <div className="h-8 w-8 rounded-md bg-background/20 flex items-center justify-center text-sm">
                                            💰
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium text-sm">{kittyMember.name}</p>
                                            <p className="text-[10px] opacity-70">Pay directly from pot</p>
                                        </div>
                                        {isKitty && <Check className="ml-auto h-4 w-4" />}
                                    </button>
                                )}

                                {/* Human Members */}
                                {humanMembers.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => {
                                            setMemberId(member.id)
                                            setShowPayerPicker(false)
                                        }}
                                        className={cn(
                                            "w-full p-3 rounded-lg flex items-center gap-3 transition-all border active:scale-[0.98]",
                                            memberId === member.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted/50 border-transparent"
                                        )}
                                    >
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="font-medium text-sm">{member.name}</p>
                                            <p className="text-[10px] opacity-70">Pot will reimburse</p>
                                        </div>
                                        {memberId === member.id && <Check className="ml-auto h-4 w-4" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Receipt upload button (Mock) */}
                    {/* <Button variant="outline" className="w-full h-11 rounded-lg bg-transparent text-sm border-dashed text-muted-foreground">
                        <Camera className="h-4 w-4 mr-2" />
                        Attach Receipt (optional)
                    </Button> */}

            {/* Submit */}
            <Button
                className="w-full h-12 rounded-xl text-sm font-medium shadow-lg shadow-primary/20"
                onClick={handleSubmit}
                disabled={!description || amountInCents === 0 || !selectedCategory}
            >
                Add Expense
            </Button>
        </BaseSheet>
    )
}
