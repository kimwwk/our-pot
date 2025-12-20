"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Camera, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
    const [amount, setAmount] = useState("")
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
        if (description && amount && selectedCategory) {
            // Default to kitty if no member selected (shouldn't happen if we default)
            const finalMemberId = memberId || kittyMember?.id;

            if (!finalMemberId) {
                console.error("No payer selected and no kitty found");
                return;
            }

            onSubmit({
                description,
                amount: Number.parseFloat(amount),
                categoryId: selectedCategory,
                memberId: finalMemberId,
                date: new Date().toISOString().split('T')[0]
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
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-neutral-950/20 dark:bg-neutral-950/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 350 }}
                        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl border-t border-border z-50 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-8 h-1 rounded-full bg-border" />
                        </div>

                        <div className="flex items-center justify-between px-5 pb-4">
                            <h2 className="text-base font-medium text-foreground">Add Expense</h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="px-5 pb-6 space-y-5">
                            {/* Amount input */}
                            <div className="text-center py-3">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Amount</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-3xl font-semibold text-foreground">
                                        {account?.currency === 'USD' ? '$' : '£'}
                                    </span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="text-3xl font-semibold text-center border-none bg-transparent w-32 p-0 focus-visible:ring-0 shadow-none"
                                    />
                                </div>
                            </div>

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
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>

                                <AnimatePresence>
                                    {showCategoryPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="grid grid-cols-3 gap-2 mt-2"
                                        >
                                            {categories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        setSelectedCategory(cat.id)
                                                        setShowCategoryPicker(false)
                                                    }}
                                                    className={cn(
                                                        "p-3 rounded-lg text-center transition-all border",
                                                        selectedCategory === cat.id
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-muted/30 hover:bg-muted/50 border-transparent"
                                                    )}
                                                >
                                                    <span className="text-xl block mb-1">{cat.icon || '📦'}</span>
                                                    <span className="text-[10px] font-medium truncate w-full block">{cat.name}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                </Button>

                                <AnimatePresence>
                                    {showPayerPicker && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-2 mt-2"
                                        >
                                            {/* Kitty Option */}
                                            {kittyMember && (
                                                <button
                                                    onClick={() => {
                                                        setMemberId(kittyMember.id)
                                                        setShowPayerPicker(false)
                                                    }}
                                                    className={cn(
                                                        "w-full p-3 rounded-lg flex items-center gap-3 transition-all border",
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
                                                        "w-full p-3 rounded-lg flex items-center gap-3 transition-all border",
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
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Receipt upload button (Mock) */}
                            <Button variant="outline" className="w-full h-11 rounded-lg bg-transparent text-sm border-dashed text-muted-foreground">
                                <Camera className="h-4 w-4 mr-2" />
                                Attach Receipt (optional)
                            </Button>

                            {/* Submit */}
                            <Button
                                className="w-full h-12 rounded-xl text-sm font-medium shadow-lg shadow-primary/20"
                                onClick={handleSubmit}
                                disabled={!description || !amount || !selectedCategory}
                            >
                                Add Expense
                            </Button>
                        </div>

                        <div className="pb-8" />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
