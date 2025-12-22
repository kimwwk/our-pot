"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, X, Camera, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  isProcessing?: boolean;
}

export function AgentInputModal({ isOpen, onClose, onSubmit, isProcessing }: AgentInputModalProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (message.trim() && !isProcessing) {
      onSubmit(message);
      setMessage("");
    }
  };

  const suggestions = [
    "I paid £42 for groceries at Tesco",
    "Add a Pet Supplies category",
    "Split last expense equally"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-8 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Ask AI Agent</p>
                  <p className="text-xs text-muted-foreground">Describe an expense or ask for help</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Input area */}
            <div className="px-5 pb-4">
              <div className="relative rounded-xl bg-muted border border-transparent focus-within:border-primary/30 focus-within:bg-background transition-all">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g., I just paid £67.50 at Tesco for groceries..."
                  className="w-full min-h-[88px] p-4 pr-24 text-sm bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  autoFocus
                />
                <div className="absolute bottom-3 right-3 flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    disabled
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground"
                    onClick={handleSubmit}
                    disabled={!message.trim() || isProcessing}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="px-5 pb-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Try saying</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setMessage(suggestion)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="px-5 pb-5">
                <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-foreground/50"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Analyzing your request...</p>
                </div>
              </div>
            )}

            <div className="pb-safe" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
