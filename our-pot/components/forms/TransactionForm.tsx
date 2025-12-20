"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, TransactionFormData } from "@/lib/validators/transaction";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/lib/data/hooks/useCategories";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useAccount } from "@/lib/data/contexts/AccountContext";

interface TransactionFormProps {
    initialData?: Partial<TransactionFormData>;
    onSubmit: (data: TransactionFormData) => Promise<void>;
    isLoading?: boolean;
}

export function TransactionForm({
    initialData,
    onSubmit,
    isLoading,
}: TransactionFormProps) {
    const { categories } = useCategories();
    const { members } = useMembers(); // All members including kitty
    const { account } = useAccount();

    // Filter out kitty from "Who paid" list for manual entry usually, 
    // but sometimes kitty pays. Let's keep all for flexibility.

    const form = useForm<TransactionFormData>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            type: "EXPENSE",
            amount: 0,
            description: "",
            merchant: "",
            category_id: "",
            member_id: "",
            date: new Date().toISOString().split("T")[0],
            ...initialData,
        },
    });

    // Pre-select current user/member if possible or default to first member to avoid empty state
    useEffect(() => {
        if (!form.getValues("member_id") && members.length > 0) {
            // Try to find a human member first
            const human = members.find(m => !m.is_kitty);
            if (human) {
                form.setValue("member_id", human.id);
            } else {
                form.setValue("member_id", members[0].id);
            }
        }
    }, [members, form]);

    const type = form.watch("type");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Type Selection */}
                <div className="flex gap-4 p-1 bg-muted rounded-lg">
                    <Button
                        type="button"
                        variant={type === "EXPENSE" ? "default" : "ghost"}
                        className="flex-1"
                        onClick={() => form.setValue("type", "EXPENSE")}
                    >
                        Expense
                    </Button>
                    <Button
                        type="button"
                        variant={type === "DEPOSIT" ? "default" : "ghost"}
                        className="flex-1"
                        onClick={() => form.setValue("type", "DEPOSIT")}
                    >
                        Deposit
                    </Button>
                </div>
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <input type="hidden" {...field} />
                    )}
                />

                {/* Amount */}
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amount ({account?.currency || 'GBP'})</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">
                                        {account?.currency === 'GBP' ? '£' : '$'}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="pl-8 text-lg font-semibold"
                                        {...field}
                                    />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Merchant (Optional) */}
                <FormField
                    control={form.control}
                    name="merchant"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Merchant / Payee</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Tesco, Amazon" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Description */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Input placeholder="What was this for?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Category */}
                <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Member (Who Paid) */}
                <FormField
                    control={form.control}
                    name="member_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Who paid?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a member" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} {m.is_kitty ? '(Pot)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Date */}
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        "Save Transaction"
                    )}
                </Button>
            </form>
        </Form>
    );
}
