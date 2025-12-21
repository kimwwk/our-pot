"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Check, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useCategories } from "@/lib/data/hooks/useCategories"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { Transaction } from "@/lib/data/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface EditExpenseSheetProps {
    transactionId: string | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function EditExpenseSheet({ transactionId, isOpen, onClose, onSuccess }: EditExpenseSheetProps) {
    const { categories } = useCategories()
    const { members } = useMembers()
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()

    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [description, setDescription] = useState("")
    const [amount, setAmount] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [memberId, setMemberId] = useState<string>("")
    const [showCategoryPicker, setShowCategoryPicker] = useState(false)
    const [showPayerPicker, setShowPayerPicker] = useState(false)

    const kittyMember = members.find(m => m.is_kitty)
    const humanMembers = members.filter(m => !m.is_kitty)
    const selectedCategoryData = categories.find((c) => c.id === selectedCategory)
    const currentPayer = members.find(m => m.id === memberId)
    const isKitty = currentPayer?.is_kitty

    // Load transaction data
    useEffect(() => {
        if (!db || !transactionId || !isOpen) {
            setTransaction(null)
            return
        }

        const fetchTransaction = async () => {
            setIsLoading(true)
            try {
                const repo = new TransactionRepository(db)
                const data = await repo.getById(transactionId)
                if (data) {
                    setTransaction(data)
                    setDescription(data.description)
                    setAmount((Math.abs(data.amount) / 100).toString())
                    setSelectedCategory(data.category_id || "")
                    setMemberId(data.member_id)
                } else {
                    toast.error("Transaction not found")
                    onClose()
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to load transaction")
                onClose()
            } finally {
                setIsLoading(false)
            }
        }

        fetchTransaction()
    }, [db, transactionId, isOpen, onClose])

    const handleUpdate = async () => {
        if (!db || !account || !transaction || !description || !amount || !selectedCategory) return

        setIsSaving(true)
        try {
            const repo = new TransactionRepository(db)
            const cents = Math.round(parseFloat(amount) * 100)

            await repo.update(transaction.id, {
                member_id: memberId,
                category_id: selectedCategory,
                type: "EXPENSE",
                // Store as positive, trigger will handle sign
                amount: Math.abs(cents),
                description,
                date: transaction.date,
            })

            toast.success("Expense updated")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error("Failed to update expense")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !transactionId) return

        if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
            return
        }

        setIsDeleting(true)
        try {
            const repo = new TransactionRepository(db)
            await repo.softDelete(transactionId)
            toast.success("Expense deleted")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error("Failed to delete expense")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                {/* Drag Handle */}
                <div className="flex justify-center pt-1 pb-3">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header with Delete Button */}
                <SheetHeader className="px-1 pb-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl">Edit Expense</SheetTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 -mr-2"
                            onClick={handleDelete}
                            disabled={isDeleting || isLoading}
                        >
                            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="px-1 pb-6 space-y-6">
                        {/* Amount Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
                                    {account?.currency === 'USD' ? '$' : '£'}
                                </span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="text-2xl h-14 pl-12 font-semibold border-2"
                                    inputMode="decimal"
                                />
                            </div>
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
                                        <span className="text-lg">{selectedCategoryData.icon || '📦'}</span>
                                        <span className="font-medium">{selectedCategoryData.name}</span>
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
                            <Button
                                variant="outline"
                                className="w-full justify-between h-11 border-2 hover:bg-accent"
                                onClick={() => setShowPayerPicker(!showPayerPicker)}
                            >
                                {isKitty ? (
                                    <span className="flex items-center gap-2 text-primary font-medium">
                                        <span className="text-lg">💰</span>
                                        The Pot
                                    </span>
                                ) : currentPayer ? (
                                    <span className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={currentPayer.avatar_url} />
                                            <AvatarFallback className="text-[10px]">{currentPayer.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{currentPayer.name}</span>
                                        <span className="text-[10px] text-amber-600">(reimburse)</span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Select payer</span>
                                )}
                                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", showPayerPicker && "rotate-180")} />
                            </Button>

                            {showPayerPicker && (
                                <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {kittyMember && (
                                        <button
                                            onClick={() => {
                                                setMemberId(kittyMember.id)
                                                setShowPayerPicker(false)
                                            }}
                                            className={cn(
                                                "w-full p-3 rounded-lg flex items-center gap-3 transition-all border-2 active:scale-[0.98]",
                                                isKitty ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted border-transparent"
                                            )}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center text-xl shrink-0">
                                                💰
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-medium">{kittyMember.name}</p>
                                                <p className="text-xs opacity-70">Pay from pot</p>
                                            </div>
                                            {isKitty && <Check className="h-5 w-5 shrink-0" />}
                                        </button>
                                    )}

                                    {humanMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => {
                                                setMemberId(member.id)
                                                setShowPayerPicker(false)
                                            }}
                                            className={cn(
                                                "w-full p-3 rounded-lg flex items-center gap-3 transition-all border-2 active:scale-[0.98]",
                                                memberId === member.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted border-transparent"
                                            )}
                                        >
                                            <Avatar className="h-10 w-10 shrink-0">
                                                <AvatarImage src={member.avatar_url} />
                                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="text-left flex-1">
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-xs opacity-70">Will be reimbursed</p>
                                            </div>
                                            {memberId === member.id && <Check className="h-5 w-5 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Update Button */}
                        <Button
                            className="w-full h-12 text-base font-semibold"
                            onClick={handleUpdate}
                            disabled={!description || !amount || !selectedCategory || isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Expense"
                            )}
                        </Button>
                    </div>
                )}

                <div className="pb-6" />
            </SheetContent>
        </Sheet>
    )
}
