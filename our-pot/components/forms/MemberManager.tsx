"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { MemberRepository } from "@/lib/data/repositories/MemberRepository";
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
import { Member } from "@/lib/data/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

            <div className="grid grid-cols-2 gap-4">
                {members.filter(m => !m.is_kitty).map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-md border bg-card">
                        <Avatar>
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
