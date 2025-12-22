"use client";

import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number; // Amount in cents
  onChange: (amountInCents: number) => void;
  currency?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  currency = "GBP",
  placeholder = "0.00",
  className,
  disabled = false,
}: CurrencyInputProps) {
  // Convert cents to decimal for display
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? (value / 100).toFixed(2) : ""
  );

  useEffect(() => {
    setDisplayValue(value > 0 ? (value / 100).toFixed(2) : "");
  }, [value]);

  const currencySymbol = currency === "USD" ? "$" : "£";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow empty input
    if (input === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Only allow numbers and one decimal point
    const regex = /^\d*\.?\d{0,2}$/;
    if (regex.test(input)) {
      setDisplayValue(input);

      // Convert to cents
      const decimal = parseFloat(input) || 0;
      const cents = Math.round(decimal * 100);
      onChange(cents);
    }
  };

  return (
    <div className="text-center py-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        Amount
      </p>
      <div className="flex items-center justify-center gap-1">
        <span className="text-3xl font-semibold text-foreground">
          {currencySymbol}
        </span>
        <Input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "text-3xl font-semibold text-center border-none bg-transparent w-32 p-0 focus-visible:ring-0 shadow-none",
            className
          )}
        />
      </div>
    </div>
  );
}
