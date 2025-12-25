"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { BaseSheet } from "@/components/common/BaseSheet"
import { CurrencyInput } from "@/components/common/CurrencyInput"
import { MemberPicker } from "@/components/common/MemberPicker"
import { useMembers } from "@/lib/data/hooks/useMembers"
import { useAccount } from "@/lib/data/contexts/AccountContext"
import { useSQLite } from "@/lib/data/contexts/SQLiteContext"
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository"
import { Transaction } from "@/lib/data/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
        <BaseSheet
            isOpen={isOpen}
            onClose={onClose}
            contentClassName="overflow-y-auto"
            title="Edit Contribution"
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
                                    className={cn("h-12", amount === value.toString() && "border-primary bg-primary/10")}
                                >
                                    {getCurrencySymbol(account?.currency || "GBP")}{value}
                                </Button>
                            ))}
                        </div>

                        {/* Member Selector */}
                        <div className="space-y-2">
                            <Label>Who is contributing?</Label>
                            <MemberPicker
                                members={humanMembers}
                                selectedMemberId={selectedMemberId}
                                onSelect={setSelectedMemberId}
                                placeholder="Select member"
                                memberSubtitle=""
                            />
                        </div>

                        {/* Update Button */}
                        <Button
                            onClick={handleUpdate}
                            disabled={!amount || !selectedMemberId || isSaving}
                            className="w-full h-12 text-base"
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
        </BaseSheet>
    )
}
