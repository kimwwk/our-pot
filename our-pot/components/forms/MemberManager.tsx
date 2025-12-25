"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { MemberRepository } from "@/lib/data/repositories/MemberRepository";
import { TransactionRepository } from "@/lib/data/repositories/TransactionRepository";
import { generateId } from "@/lib/utils/ulid";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
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
import { Plus, Trash2, AlertCircle, MoreHorizontal, Users } from "lucide-react";
import { Member } from "@/lib/data/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/common/EmptyState";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberDetailSheet } from "@/components/sheets/MemberDetailSheet";

const memberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    avatar_url: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberManagerProps {
    onUpdate?: () => void;
    members: Member[];
}

export function MemberManager({ onUpdate, members }: MemberManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [deletingMember, setDeletingMember] = useState<Member | null>(null);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const { db } = useSQLite();
    const { account } = useAccount();

    const form = useForm<MemberFormData>({
        resolver: zodResolver(memberSchema),
        defaultValues: {
            name: "",
            avatar_url: "",
        }
    });

    const onSubmit = async (data: MemberFormData) => {
        if (!db || !account) return;

        try {
            const repo = new MemberRepository(db);
            await repo.create({
                id: generateId(),
                account_id: account.id,
                name: data.name,
                role: "member",
                is_kitty: 0,
                avatar_url: data.avatar_url || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            toast.success("Member added");
            setIsOpen(false);
            form.reset();
            onUpdate?.();
        } catch (e) {
            console.error(e);
            toast.error("Failed to add member");
        }
    };

    const handleDeleteMember = async () => {
        if (!db || !deletingMember) return;

        // Prevent deleting kitty member
        if (deletingMember.is_kitty) {
            toast.error("Cannot delete the kitty member");
            setDeletingMember(null);
            return;
        }

        try {
            // Check if member has transactions
            const transactionRepo = new TransactionRepository(db);
            const memberTransactions = await transactionRepo.getAllByAccount(account?.id || '', { memberId: deletingMember.id });

            if (memberTransactions.length > 0) {
                toast.error(`Cannot delete member with ${memberTransactions.length} transaction(s)`);
                setDeletingMember(null);
                return;
            }

            const repo = new MemberRepository(db);
            await repo.softDelete(deletingMember.id);

            toast.success(`${deletingMember.name} removed`);
            setDeletingMember(null);
            onUpdate?.();
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete member");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Household Members</h3>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Member</DialogTitle>
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
                                                <Input placeholder="e.g. Alice" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">Add Member</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {members.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No members yet"
                    description="Add household members to start tracking shared expenses together"
                    action={{
                        label: "Add Member",
                        onClick: () => setIsOpen(true)
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium flex-1">
                                {member.name}
                                {member.is_kitty ? ' (Pot)' : ''}
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                                        View Details
                                    </DropdownMenuItem>
                                    {!member.is_kitty && (
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setDeletingMember(member)}
                                        >
                                            Delete Member
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                </div>
            )}

            {/* Member Detail Sheet */}
            <MemberDetailSheet
                member={selectedMember}
                isOpen={!!selectedMember}
                onClose={() => setSelectedMember(null)}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingMember} onOpenChange={() => setDeletingMember(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Member?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove <strong>{deletingMember?.name}</strong>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 flex gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            Members with existing transactions cannot be deleted.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingMember(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteMember}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
