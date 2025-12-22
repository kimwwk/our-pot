"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { cn } from "@/lib/utils";

interface BaseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BaseSheet({ isOpen, onClose, title, children, className }: BaseSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className={cn("h-[90vh] overflow-y-auto", className)}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-1 pb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <SheetHeader className="px-1 pb-4">
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )}

        {/* Content with consistent padding */}
        <div className="px-1 pb-6 space-y-5 mt-2">
          {children}
        </div>

        {/* Bottom safe area */}
        <div className="pb-6" />
      </SheetContent>
    </Sheet>
  );
}
