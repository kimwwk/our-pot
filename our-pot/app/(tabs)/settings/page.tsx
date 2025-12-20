"use client"

import { ModeToggle } from "@/components/mode-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                        Customize how OurPot looks on your device.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <span>Theme</span>
                    <ModeToggle />
                </CardContent>
            </Card>

            <div className="text-xs text-center text-muted-foreground pt-8">
                v0.1.0 • OurPot
            </div>
        </div>
    )
}
