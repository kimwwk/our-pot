"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trash2, Plus, Edit3, ShoppingCart, Tag, Sparkles, ChevronDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { CategoryRepository } from "@/lib/data/repositories/CategoryRepository";

interface ChangeSetReviewWidgetProps {
  onApprove: () => void;
  onReject: (feedback?: string) => void;
  onDiscard: () => void;
  onModifyRequest: (message: string) => void;
}

interface ParsedChange {
  id: string;
  operation: string;
  entity: string;
  proposedData: any;
  categoryName?: string;
}

export function ChangeSetReviewWidget({ onApprove, onReject, onDiscard, onModifyRequest }: ChangeSetReviewWidgetProps) {
  const { getBufferAsArray } = useChangeSet();
  const { db } = useSQLite();
  const { account } = useAccount();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");
  const [parsedChanges, setParsedChanges] = useState<ParsedChange[]>([]);

  const changes = getBufferAsArray();

  // Parse changes and look up category names
  useEffect(() => {
    async function parseChanges() {
      if (!db || !account) return;

      const categoryRepo = new CategoryRepository(db);
      const categories = await categoryRepo.getAllByAccount(account.id);
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));

      const parsed = changes.map(change => {
        const proposedData = change.proposedData ? JSON.parse(change.proposedData) : null;
        const categoryName = proposedData?.category_id ? categoryMap.get(proposedData.category_id) : undefined;

        return {
          id: change.id,
          operation: change.operationType,
          entity: change.entityType,
          proposedData,
          categoryName,
        };
      });

      setParsedChanges(parsed);
    }

    parseChanges();
  }, [changes, db, account]);

  if (changes.length === 0) return null;

  const getChangeIcon = (operation: string) => {
    switch (operation) {
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

  const getChangeTypeLabel = (entity: string, operation: string) => {
    const entityLabel = entity === "transaction" ? "Transaction" : "Category";
    switch (operation) {
      case "create":
        return `New ${entityLabel}`;
      case "update":
        return `Update ${entityLabel}`;
      case "delete":
        return `Delete ${entityLabel}`;
      default:
        return `${operation} ${entityLabel}`;
    }
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return null;
    // Amount is stored in pence, convert to pounds
    const pounds = amount / 100;
    return `£${pounds.toFixed(2)}`;
  };

  const handleModifySubmit = () => {
    if (modifyMessage.trim()) {
      onModifyRequest(modifyMessage);
      setModifyMessage("");
      setShowModifyInput(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
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
            <p className="font-medium text-foreground text-sm">AI Proposal</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
              {parsedChanges.length} {parsedChanges.length === 1 ? 'change' : 'changes'}
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
            {/* Changes list */}
            <div className="px-4 pb-3 space-y-2">
              {parsedChanges.map((change, index) => (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-start gap-3 rounded-lg bg-muted/30 p-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-background text-muted-foreground">
                    {getChangeIcon(change.operation)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {getChangeTypeLabel(change.entity, change.operation)}
                    </span>

                    {/* Transaction details */}
                    {change.entity === "transaction" && (
                      <>
                        <p className="text-sm font-medium text-foreground mt-0.5">
                          {change.proposedData?.description || "Transaction"}
                        </p>
                        <p className="text-sm text-primary font-medium mt-1">
                          {formatAmount(change.proposedData?.amount)}
                          {change.proposedData?.merchant && (
                            <span className="text-muted-foreground font-normal"> · {change.proposedData.merchant}</span>
                          )}
                          {change.categoryName && (
                            <span className="text-muted-foreground font-normal"> · {change.categoryName}</span>
                          )}
                        </p>
                      </>
                    )}

                    {/* Category details */}
                    {change.entity === "category" && (
                      <>
                        <p className="text-sm font-medium text-foreground mt-0.5">
                          {change.proposedData?.name || "Category"}
                        </p>
                        {change.proposedData?.icon && (
                          <p className="text-sm mt-1">
                            <span className="mr-1">{change.proposedData.icon}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Modify input */}
            <AnimatePresence>
              {showModifyInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-3"
                >
                  <div className="rounded-lg bg-muted p-3">
                    <textarea
                      value={modifyMessage}
                      onChange={(e) => setModifyMessage(e.target.value)}
                      placeholder="Tell the AI what to change..."
                      className="w-full text-sm bg-transparent resize-none focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowModifyInput(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleModifySubmit} disabled={!modifyMessage.trim()}>
                        Send
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
                  onClick={() => onReject()}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 h-9 rounded-lg text-muted-foreground text-sm"
                  onClick={() => setShowModifyInput(true)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Request Changes
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={onDiscard}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
