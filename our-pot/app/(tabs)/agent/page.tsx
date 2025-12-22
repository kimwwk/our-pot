import { AgentTab } from "@/components/features/agent/AgentTab";

export default function AgentPage() {
    return (
        <div className="p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <AgentTab />
        </div>
    );
}
