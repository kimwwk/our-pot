"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TransactionSearchBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function TransactionSearchBar({
    searchTerm,
    onSearchChange,
    placeholder = "Search transactions...",
    className = "",
}: TransactionSearchBarProps) {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder={placeholder}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
    );
}
