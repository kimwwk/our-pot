import { BottomNav } from "@/components/widgets/BottomNav"

export default function TabsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen pb-16">
            <main className="flex-1 container max-w-md mx-auto p-4">
                {children}
            </main>
            <BottomNav />
        </div>
    )
}
