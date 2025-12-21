import { AgentChatPanel } from "@/components/features/agent/AgentChatPanel";

export default function AgentPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <AgentChatPanel />
        </div>
    );
}
