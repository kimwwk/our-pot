"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  Trash2,
  Plus,
  Edit3,
  ShoppingCart,
  Tag,
  Sparkles,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChangeSet, ChangeRequest } from "@/lib/data/contexts/ChangeSetContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { convertCentsToDecimal } from "@/lib/ai/validation";
import { formatCurrency } from "@/lib/utils/format";

interface ReviewWidgetProps {
  onApprove: () => void;
  onReject: (feedback?: string) => void;
  onCompleteReject: () => void;
}

export function ReviewWidget({ onApprove, onReject, onCompleteReject }: ReviewWidgetProps) {
  const { status, metadata, getBufferAsArray } = useChangeSet();
  const { account } = useAccount();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Only show if status is pending_approval
  if (status !== "pending_approval" || !metadata) {
    return null;
  }

  const changeRequests = getBufferAsArray();

  const getChangeIcon = (operationType: string) => {
    switch (operationType) {
      case "create":
        return <Plus className="h-4 w-4" />;
      case "update":
        return <Edit3 className="h-4 w-4" />;
      case "delete":
        return <Trash2 className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getChangeTypeLabel = (operationType: string, entityType: string) => {
    const entity = entityType.charAt(0).toUpperCase() + entityType.slice(1);

    switch (operationType) {
      case "create":
        return `New ${entity}`;
      case "update":
        return `Update ${entity}`;
      case "delete":
        return `Delete ${entity}`;
      default:
        return "Change";
    }
  };

  const formatChangeData = (request: ChangeRequest) => {
    try {
      const data = request.proposedData ? JSON.parse(request.proposedData) : {};

      if (request.entityType === "transaction") {
        return {
          amount: data.amount ? convertCentsToDecimal(data.amount) : null,
          merchant: data.merchant,
          description: data.description,
          type: data.type,
        };
      } else if (request.entityType === "category") {
        return {
          name: data.name,
          icon: data.icon,
          color: data.color,
        };
      }

      return data;
    } catch (e) {
      console.error("Failed to parse change data", e);
      return {};
    }
  };

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      onReject(feedback);
      setFeedback("");
      setShowFeedbackInput(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="rounded-xl bg-card border border-border shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm">{metadata.title}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              {changeRequests.length} changes
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Review and approve to apply</p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Description */}
            {metadata.description && (
              <div className="px-4 pb-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-foreground leading-relaxed">{metadata.description}</p>
                </div>
              </div>
            )}

            {/* Changes list */}
            <div className="px-4 pb-3 space-y-2">
              {changeRequests.map((request, index) => {
                const data = formatChangeData(request);

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground">
                      {getChangeIcon(request.operationType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {getChangeTypeLabel(request.operationType, request.entityType)}
                      </span>

                      {/* Transaction display */}
                      {request.entityType === "transaction" && (
                        <>
                          <p className="text-sm font-medium text-foreground mt-0.5">
                            {data.description || "Transaction"}
                          </p>
                          {data.amount && (
                            <p className="text-sm text-primary font-medium mt-1">
                              {formatCurrency(data.amount * 100, account?.currency || "GBP")}
                              {data.merchant && (
                                <span className="text-muted-foreground font-normal"> · {data.merchant}</span>
                              )}
                            </p>
                          )}
                        </>
                      )}

                      {/* Category display */}
                      {request.entityType === "category" && (
                        <>
                          <p className="text-sm font-medium text-foreground mt-0.5">{data.name}</p>
                          {data.icon && (
                            <p className="text-sm mt-1">
                              <span className="mr-1">{data.icon}</span>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Feedback input */}
            <AnimatePresence>
              {showFeedbackInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-3"
                >
                  <div className="rounded-lg bg-muted p-3">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Tell the AI what to change..."
                      className="w-full text-sm bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowFeedbackInput(false);
                          setFeedback("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleFeedbackSubmit} disabled={!feedback.trim()}>
                        Send Feedback
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={onApprove}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-lg bg-transparent"
                  onClick={onCompleteReject}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-9 rounded-lg text-muted-foreground text-sm"
                  onClick={() => setShowFeedbackInput(true)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Request Changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
