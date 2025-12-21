"use client";

import { BottomNav } from "@/components/widgets/BottomNav"
import { PotSwitcher } from "@/components/widgets/PotSwitcher"

export default function TabsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen pb-16">
            {/* Header with PotSwitcher */}
            <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
                <div className="container max-w-md mx-auto p-4 flex justify-between items-center">
                    <PotSwitcher />
                </div>
            </header>

            <main className="flex-1 container max-w-md mx-auto p-4">
                {children}
            </main>
            <BottomNav />
        </div>
    )
}
