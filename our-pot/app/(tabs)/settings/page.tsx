"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { CategoryManager } from "@/components/forms/CategoryManager";
import { MemberManager } from "@/components/forms/MemberManager";
import { useCategories } from "@/lib/data/hooks/useCategories";
import { useMembers } from "@/lib/data/hooks/useMembers";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
    const { categories, refetch: refetchCats } = useCategories();
    const { members, refetch: refetchMembers } = useMembers();

    return (
        <div className="container mx-auto p-4 space-y-8 pb-24">
            <h1 className="text-2xl font-bold">Settings</h1>

            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Appearance</h2>
                <div className="flex items-center justify-between">
                    <span>Theme</span>
                    <ModeToggle />
                </div>
            </div>

            <Separator />

            <MemberManager members={members} onUpdate={refetchMembers} />

            <Separator />

            <CategoryManager categories={categories} onUpdate={refetchCats} />

            <div className="text-xs text-center text-muted-foreground pt-8">
                v0.1.0 • OurPot
            </div>
        </div>
    );
}
