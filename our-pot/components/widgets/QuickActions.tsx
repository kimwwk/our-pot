"use client";

import { Plus, ArrowUpRight, Sparkles } from "lucide-react";

interface QuickActionsProps {
    onAddExpense?: () => void;
    onContribute?: () => void;
    onAskAgent?: () => void;
}

export function QuickActions({ onAddExpense, onContribute, onAskAgent }: QuickActionsProps) {
    return (
        <div className="flex items-start justify-center gap-8 px-4">
            {/* Expense Button */}
            <button
                onClick={onAddExpense}
                className="flex flex-col items-center gap-2 flex-1 max-w-[100px]"
                disabled={!onAddExpense}
            >
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform shadow-md disabled:opacity-50">
                    <Plus className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-center whitespace-nowrap">Expense</span>
            </button>

            {/* Contribute Button */}
            <button
                onClick={onContribute}
                className="flex flex-col items-center gap-2 flex-1 max-w-[100px]"
                disabled={!onContribute}
            >
                <div className="h-14 w-14 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition-transform shadow-md disabled:opacity-50">
                    <ArrowUpRight className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-center whitespace-nowrap">Contribute</span>
            </button>

            {/* Ask AI Button */}
            <button
                onClick={onAskAgent}
                className="flex flex-col items-center gap-2 flex-1 max-w-[100px]"
                disabled={!onAskAgent}
            >
                <div className="h-14 w-14 rounded-full border-2 border-border bg-background text-foreground flex items-center justify-center active:scale-95 transition-transform shadow-sm disabled:opacity-50">
                    <Sparkles className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-center whitespace-nowrap">Ask AI</span>
            </button>
        </div>
    );
}
