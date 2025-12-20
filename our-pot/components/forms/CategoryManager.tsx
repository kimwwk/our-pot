"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { CategoryRepository } from "@/lib/data/repositories/CategoryRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import { Category } from "@/lib/data/types";

const categorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FF0000)").optional().or(z.literal("")),
    icon: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryManagerProps {
    onUpdate?: () => void;
    categories: Category[];
}

export function CategoryManager({ onUpdate, categories }: CategoryManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { db } = useSQLite();
    const { account } = useAccount();

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: "",
            color: "#64748b",
            icon: "",
        }
    });

    const onSubmit = async (data: CategoryFormData) => {
        if (!db || !account) return;

        try {
            const repo = new CategoryRepository(db);
            await repo.create({
                id: generateId(),
                account_id: account.id,
                name: data.name,
                color: data.color || undefined,
                icon: data.icon || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Category created");
            setIsOpen(false);
            form.reset();
            onUpdate?.();
        } catch (e) {
            console.error(e);
            toast.error("Failed to create category");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete category? Transactions will be uncategorized.") || !db) return;
        try {
            const repo = new CategoryRepository(db);
            await repo.softDelete(id);
            toast.success("Category deleted");
            onUpdate?.();
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Categories</h3>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Category</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Utilities" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="color"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Color (Hex)</FormLabel>
                                            <div className="flex gap-2">
                                                <Input type="color" className="w-12 p-1 h-9" {...field} />
                                                <Input placeholder="#000000" {...field} />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Create</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: cat.color || '#ccc' }}
                            />
                            <span>{cat.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(cat.id)}
                        >
                            Delete
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
