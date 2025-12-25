"use client";

import { Sheet, SheetContent, SheetTitle, SheetDescription } from "../ui/sheet";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BaseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function BaseSheet({
  isOpen,
  onClose,
  title,
  description,
  icon,
  headerAction,
  children,
  className,
  contentClassName
}: BaseSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className={cn("h-auto max-h-[85vh] p-0 rounded-t-2xl", className)}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Accessibility: Always render SheetTitle, hide if not provided */}
        {title ? (
          <div className="flex items-center gap-3 px-5 pb-4">
            {icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div className="flex-1">
              <SheetTitle className="text-xl font-semibold">
                {title}
              </SheetTitle>
              {description && (
                <SheetDescription className="text-xs text-muted-foreground">
                  {description}
                </SheetDescription>
              )}
            </div>
            {headerAction && (
              <div className="-mr-2">
                {headerAction}
              </div>
            )}
          </div>
        ) : (
          <SheetTitle className="sr-only">Sheet</SheetTitle>
        )}

        {/* Content - flexible, no forced padding */}
        <div className={cn("overflow-y-auto", contentClassName)}>
          {children}
        </div>

        {/* Bottom safe area */}
        <div className="pb-safe" />
      </SheetContent>
    </Sheet>
  );
}
