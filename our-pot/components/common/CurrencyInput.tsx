"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CurrencyInputProps {
    value: string
    onChange: (value: string) => void
    currency?: string
    placeholder?: string
    className?: string
    size?: "default" | "large"
    disabled?: boolean
}

export function CurrencyInput({
    value,
    onChange,
    currency = "GBP",
    placeholder = "0.00",
    className,
    size = "default",
    disabled = false,
}: CurrencyInputProps) {
    const getCurrencySymbol = (curr: string) => {
        const symbols: Record<string, string> = {
            GBP: "£",
            USD: "$",
            EUR: "€",
        }
        return symbols[curr] || curr
    }

    const sizeClasses = {
        default: {
            symbol: "text-2xl",
            input: "text-2xl h-14",
        },
        large: {
            symbol: "text-3xl",
            input: "text-3xl h-16",
        },
    }

    return (
        <div className="relative">
            <span
                className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground",
                    sizeClasses[size].symbol
                )}
            >
                {getCurrencySymbol(currency)}
            </span>
            <Input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    "pl-12 font-semibold",
                    sizeClasses[size].input,
                    className
                )}
                inputMode="decimal"
            />
        </div>
    )
}
