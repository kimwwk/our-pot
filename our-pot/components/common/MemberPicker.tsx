"use client"

import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface MemberPickerMember {
    id: string
    name: string
    avatar_url?: string
    is_kitty?: boolean | 0 | 1
}

interface MemberPickerProps {
    members: MemberPickerMember[]
    selectedMemberId: string
    onSelect: (memberId: string) => void
    placeholder?: string
    kittyLabel?: string
    kittySubtitle?: string
    memberSubtitle?: string
    className?: string
}

export function MemberPicker({
    members,
    selectedMemberId,
    onSelect,
    placeholder = "Select member",
    kittyLabel = "The Pot",
    kittySubtitle = "Pay from pot",
    memberSubtitle = "Will be reimbursed",
    className,
}: MemberPickerProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedMember = members.find(m => m.id === selectedMemberId)
    const isKitty = selectedMember?.is_kitty

    const handleSelect = (memberId: string) => {
        onSelect(memberId)
        setIsOpen(false)
    }

    return (
        <div className={cn("space-y-2", className)}>
            <Button
                variant="outline"
                className="w-full justify-between h-11 border-2 hover:bg-accent"
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                {isKitty ? (
                    <span className="flex items-center gap-2 text-primary font-medium">
                        <span className="text-lg">💰</span>
                        {kittyLabel}
                    </span>
                ) : selectedMember ? (
                    <span className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedMember.avatar_url} />
                            <AvatarFallback className="text-[10px]">{selectedMember.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedMember.name}</span>
                        {!selectedMember.is_kitty && memberSubtitle && (
                            <span className="text-[10px] text-amber-600">({memberSubtitle})</span>
                        )}
                    </span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
            </Button>

            {isOpen && (
                <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {members.map((member) => (
                        <button
                            key={member.id}
                            onClick={() => handleSelect(member.id)}
                            className={cn(
                                "w-full p-3 rounded-lg flex items-center gap-3 transition-all border-2 active:scale-[0.98]",
                                selectedMemberId === member.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/30 hover:bg-muted border-transparent"
                            )}
                            type="button"
                        >
                            {member.is_kitty ? (
                                <div className="h-10 w-10 rounded-full bg-background/20 flex items-center justify-center text-xl shrink-0">
                                    💰
                                </div>
                            ) : (
                                <Avatar className="h-10 w-10 shrink-0">
                                    <AvatarImage src={member.avatar_url} />
                                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="text-left flex-1">
                                <p className="font-medium">{member.name}</p>
                                <p className="text-xs opacity-70">
                                    {member.is_kitty ? kittySubtitle : memberSubtitle}
                                </p>
                            </div>
                            {selectedMemberId === member.id && <Check className="h-5 w-5 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
