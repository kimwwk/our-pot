"use client";

import { motion } from "framer-motion";
import { TrendingDown, Calendar, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { useAccount } from "@/lib/data/contexts/AccountContext";

export default function AnalyticsPage() {
  const { account } = useAccount();

  if (!account) {
    return (
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Placeholder data - will be replaced with real data in the future
  const totalBudget = 0;
  const totalSpent = 0;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Period selector */}
      <div className="flex gap-2">
        {["Week", "Month", "Year"].map((period, i) => (
          <button
            key={period}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              i === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <EmptyState
        icon={Sparkles}
        title="No Data Yet"
        description="Start tracking expenses to see analytics and insights about your spending patterns."
      />

      {/* Overview card skeleton (for future) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-card p-5 border border-border/50 opacity-50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Monthly Overview</h3>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-foreground">£{totalSpent.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">of £{totalBudget} budget</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-medium">-</span>
            </div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary w-0" />
        </div>
        <p className="text-xs text-muted-foreground mt-2">0% of budget used</p>
      </motion.div>

      {/* Category breakdown skeleton */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Spending by Category</h3>
        <div className="rounded-xl bg-card p-4 border border-border/50 opacity-50">
          <p className="text-sm text-muted-foreground text-center py-8">
            Category breakdown will appear here once you have transactions
          </p>
        </div>
      </div>

      {/* Member contributions skeleton */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Contributions</h3>
        <div className="rounded-xl bg-card p-4 border border-border/50 opacity-50">
          <p className="text-sm text-muted-foreground text-center py-8">
            Member contributions will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
