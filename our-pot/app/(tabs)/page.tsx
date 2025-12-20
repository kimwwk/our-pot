"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HomePage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">OurPot</h1>
                <Button variant="outline" size="icon">
                    <span className="sr-only">Notifications</span>
                    🔔
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <span className="text-muted-foreground">💰</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">£0.00</div>
                    <p className="text-xs text-muted-foreground">
                        +£0.00 from last month
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Quick Actions placeholder */}
                <Button className="w-full">
                    + Add Expense
                </Button>
            </div>
        </div>
    )
}
