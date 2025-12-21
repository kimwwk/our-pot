"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AgentInput({ value, onChange, onSubmit, disabled, placeholder }: AgentInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="relative rounded-xl bg-muted border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-all">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Tell the AI about an expense (e.g., I paid £42 for groceries at Tesco)"}
        className="w-full min-h-[88px] p-4 pr-14 text-sm bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <div className="absolute bottom-3 right-3">
        <Button
          size="icon"
          className="h-9 w-9 rounded-lg bg-primary text-primary-foreground"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
