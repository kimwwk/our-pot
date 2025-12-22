"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/lib/utils";

interface MemberOption {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle?: string;
  icon?: string; // Optional emoji icon (e.g., for kitty: 💰)
  isPrimary?: boolean; // Highlight this option (e.g., for kitty)
}

interface MemberPickerProps {
  label: string;
  members: MemberOption[];
  selectedId: string;
  onSelect: (memberId: string) => void;
  placeholder?: string;
  className?: string;
}

export function MemberPicker({
  label,
  members,
  selectedId,
  onSelect,
  placeholder = "Select member",
  className,
}: MemberPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedMember = members.find((m) => m.id === selectedId);

  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
        {label}
      </label>
      <Button
        variant="outline"
        className="w-full justify-between h-11 rounded-lg bg-transparent text-sm border-input hover:bg-muted/30"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedMember ? (
          <span
            className={cn(
              "flex items-center gap-2",
              selectedMember.isPrimary && "text-primary font-medium"
            )}
          >
            {selectedMember.icon ? (
              <div className="h-5 w-5 flex items-center justify-center text-sm">
                {selectedMember.icon}
              </div>
            ) : (
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedMember.avatarUrl} />
                <AvatarFallback className="text-[8px]">
                  {selectedMember.name[0]}
                </AvatarFallback>
              </Avatar>
            )}
            {selectedMember.name}
            {selectedMember.subtitle && (
              <span className="text-[10px] text-amber-600 ml-1">
                {selectedMember.subtitle}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {members.map((member) => {
            const isSelected = selectedId === member.id;
            return (
              <button
                key={member.id}
                onClick={() => {
                  onSelect(member.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full p-3 rounded-lg flex items-center gap-3 transition-all border active:scale-[0.98]",
                  isSelected || member.isPrimary
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 hover:bg-muted/50 border-transparent"
                )}
              >
                {member.icon ? (
                  <div className="h-8 w-8 rounded-md bg-background/20 flex items-center justify-center text-sm">
                    {member.icon}
                  </div>
                ) : (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {member.name[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="text-left">
                  <p className="font-medium text-sm">{member.name}</p>
                  {member.subtitle && (
                    <p className="text-[10px] opacity-70">{member.subtitle}</p>
                  )}
                </div>
                {isSelected && <Check className="ml-auto h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
