"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListOrdered, PieChart, Sparkles, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export function BottomNav() {
    const pathname = usePathname()

    const navItems = [
        {
            name: "Home",
            href: "/",
            icon: Home,
        },
        {
            name: "Transactions",
            href: "/transactions",
            icon: ListOrdered,
        },
        {
            name: "Agent",
            href: "/agent",
            icon: Sparkles,
        },
        {
            name: "Analytics",
            href: "/analytics",
            icon: PieChart,
        },
        {
            name: "Settings",
            href: "/settings",
            icon: Settings,
        },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg pb-safe">
            <nav className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
