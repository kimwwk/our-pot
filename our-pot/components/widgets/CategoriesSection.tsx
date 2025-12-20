"use client";

import { useCategories } from "@/lib/data/hooks/useCategories";
import { cn } from "@/lib/utils/cn";
import { Plus } from "lucide-react";
import Link from "next/link";

export function CategoriesSection() {
    const { categories, isLoading } = useCategories();

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                <div className="flex gap-3 overflow-hidden">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 w-24 bg-muted animate-pulse rounded-xl flex-shrink-0" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">Categories</h2>
                <Link href="/settings" className="text-sm text-primary">Manage</Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0"
                    >
                        <div
                            className={cn(
                                "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm border transition-transform group-active:scale-95",
                                "bg-card hover:bg-muted/50"
                            )}
                            style={category.color ? { backgroundColor: `${category.color}20`, color: category.color, borderColor: `${category.color}40` } : undefined}
                        >
                            {category.icon || "📁"}
                        </div>
                        <span className="text-xs font-medium text-center max-w-[4rem] truncate">
                            {category.name}
                        </span>
                    </div>
                ))}

                {/* Add Category Button */}
                <Link href="/settings" className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 border border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground shadow-sm transition-transform group-active:scale-95">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Add New</span>
                </Link>
            </div>
        </div>
    );
}
