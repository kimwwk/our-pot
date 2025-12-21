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
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    // Show first 6 categories in grid
    const displayCategories = categories.slice(0, 6);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">Categories</h2>
                <Link href="/settings" className="text-sm text-primary">Manage</Link>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {displayCategories.map((category) => (
                    <button
                        key={category.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-card active:scale-95 transition-transform"
                        style={category.color ? { backgroundColor: `${category.color}10`, borderColor: `${category.color}40` } : undefined}
                    >
                        <span
                            className="text-3xl"
                            style={{ color: category.color }}
                        >
                            {category.icon || "📁"}
                        </span>
                        <span className="text-xs font-medium text-center truncate w-full">
                            {category.name}
                        </span>
                    </button>
                ))}

                {/* Add Category Button - only show if less than 6 categories */}
                {displayCategories.length < 6 && (
                    <Link
                        href="/settings"
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 border border-dashed border-muted-foreground/30 active:scale-95 transition-transform"
                    >
                        <Plus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Add New</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
