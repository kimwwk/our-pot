"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BaseSheet } from "@/components/common/BaseSheet"
import { CurrencyInput } from "@/components/common/CurrencyInput"
import { MemberPicker } from "@/components/common/MemberPicker"
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

    const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

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
        <BaseSheet
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Expense"
            headerAction={
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={isDeleting || isLoading}
                >
                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </Button>
            }
        >
            {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
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
                            <MemberPicker
                                members={members}
                                selectedMemberId={memberId}
                                onSelect={setMemberId}
                                placeholder="Select payer"
                                memberSubtitle="reimburse"
                            />
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
        </BaseSheet>
    )
}
