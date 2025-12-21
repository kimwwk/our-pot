"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { Transaction } from "@/lib/data/types"
import { toast } from "sonner"

interface EditContributionSheetProps {
    transactionId: string | null
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function EditContributionSheet({ transactionId, isOpen, onClose, onSuccess }: EditContributionSheetProps) {
    const { members } = useMembers()
    const { account, reloadAccount } = useAccount()
    const { db } = useSQLite()

    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [amount, setAmount] = useState("")
    const [selectedMemberId, setSelectedMemberId] = useState<string>("")

    const humanMembers = members.filter(m => !m.is_kitty)
    const quickAmounts = [50, 100, 200, 500]

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
                    setAmount((data.amount / 100).toString())
                    setSelectedMemberId(data.member_id)
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

    const handleQuickAmount = (value: number) => {
        setAmount(value.toString())
    }

    const handleUpdate = async () => {
        if (!db || !account || !transaction || !amount || !selectedMemberId) {
            toast.error("Please fill in all fields")
            return
        }

        const amountNum = parseFloat(amount)
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setIsSaving(true)
        try {
            const repo = new TransactionRepository(db)
            const amountInCents = Math.round(amountNum * 100)

            await repo.update(transaction.id, {
                member_id: selectedMemberId,
                type: "DEPOSIT",
                amount: amountInCents,
                date: transaction.date,
            })

            toast.success("Contribution updated")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error("Failed to update contribution:", error)
            toast.error("Failed to update contribution")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !transactionId) return

        if (!confirm("Are you sure you want to delete this contribution? This action cannot be undone.")) {
            return
        }

        setIsDeleting(true)
        try {
            const repo = new TransactionRepository(db)
            await repo.softDelete(transactionId)
            toast.success("Contribution deleted")
            await reloadAccount()
            onSuccess?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error("Failed to delete contribution")
        } finally {
            setIsDeleting(false)
        }
    }

    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
            GBP: "£",
            USD: "$",
            EUR: "€",
        }
        return symbols[currency] || currency
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
                        <SheetTitle className="text-xl">Edit Contribution</SheetTitle>
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
                                    {getCurrencySymbol(account?.currency || "GBP")}
                                </span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-2xl h-14 pl-12 font-semibold border-2"
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
                                    className={amount === value.toString() ? "border-primary border-2 bg-primary/10" : "border-2"}
                                >
                                    {getCurrencySymbol(account?.currency || "GBP")}{value}
                                </Button>
                            ))}
                        </div>

                        {/* Member Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Who is contributing?
                            </label>
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger className="h-11 border-2">
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

                        {/* Update Button */}
                        <Button
                            onClick={handleUpdate}
                            disabled={!amount || !selectedMemberId || isSaving}
                            className="w-full h-12 text-base font-semibold"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                `Update ${amount ? getCurrencySymbol(account?.currency || "GBP") + amount : ""} Contribution`
                            )}
                        </Button>
                    </div>
                )}

                <div className="pb-6" />
            </SheetContent>
        </Sheet>
    )
}
