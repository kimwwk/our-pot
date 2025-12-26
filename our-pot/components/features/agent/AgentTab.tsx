"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { handleToolCall } from "@/lib/ai/transformation";
import { ChangeSetRepository } from "@/lib/data/repositories/ChangeSetRepository";
import { buildContextAfterDecision } from "@/lib/ai/prompts";
import { AgentInputModal } from "./AgentInputModal";
import { ChangeSetReviewWidget } from "./ChangeSetReviewWidget";
import { EmptyState } from "@/components/common/EmptyState";

export function AgentTab() {
  const { db, isInitialized } = useSQLite();
  const { account } = useAccount();
  const changeSetContext = useChangeSet();

  // Refs to access current values in callbacks (avoid stale closures)
  const dbRef = useRef(db);
  const accountRef = useRef(account);
  const isInitializedRef = useRef(isInitialized);
  const changeSetContextRef = useRef(changeSetContext);

  // Update refs when values change
  useEffect(() => {
    dbRef.current = db;
    accountRef.current = account;
    isInitializedRef.current = isInitialized;
    changeSetContextRef.current = changeSetContext;
  }, [db, account, isInitialized, changeSetContext]);

  // Ref to store pending confirmation resolver
  const pendingConfirmationResolver = useRef<((result: any) => void) | null>(null);

  // Local state
  const [showInput, setShowInput] = useState(false);

  // AI Chat hook
  const {
    messages,
    sendMessage,
    addToolOutput,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      console.log('[useChat] onToolCall triggered:', toolCall.toolName);
      // Use refs to get current values (avoid stale closures)
      const currentDb = dbRef.current;
      const currentAccount = accountRef.current;

      // Validate required context
      if (!currentDb || !currentAccount) {
        console.error(`[Tool Call Error] Missing context: db=${!!currentDb}, account=${!!currentAccount}`);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: `Database or account not initialized`,
        });
        return;
      }

      // Route via central handler
      const result = await handleToolCall(
        toolCall.toolName,
        toolCall.input,
        {
          db: currentDb,
          accountId: currentAccount.id,
          changeSetActions: {
            addChangeRequest: changeSetContextRef.current.addChangeRequest,
            removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            transitionToPendingApproval: changeSetContextRef.current.transitionToPendingApproval,
            clearBuffer: changeSetContextRef.current.clearBuffer,
            getBufferAsArray: changeSetContextRef.current.getBufferAsArray,
          },
        }
      );

      // Handle result based on type
      if (result.type === 'success') {
        console.log('[useChat] Tool result: SUCCESS', toolCall.toolName);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: result.output,
        });
      } else if (result.type === 'error') {
        console.log('[useChat] Tool result: ERROR', toolCall.toolName, result.errorText);
        addToolOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: result.errorText,
        });
      } else if (result.type === 'pause') {
        console.log('[useChat] Tool result: PAUSE (confirmChangeSet)', {
          toolName: toolCall.toolName,
          toolCallId: toolCall.toolCallId
        });
        // PAUSE: confirmChangeSet executed successfully, now waiting for user approval
        // Store resolver so widget can resume AI stream later
        pendingConfirmationResolver.current = (resultData: any) => {
          console.log('[useChat] Resolver called with:', resultData);
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            output: resultData,
          });
          console.log('[useChat] addToolOutput called, AI stream should resume');
        };
        console.log('[useChat] Resolver stored, waiting for user decision');
        // DO NOT call addToolOutput here - widget will do it
      }
    },
  });

  // Log status and changeset state changes
  useEffect(() => {
    console.log('[AgentTab] State changed:', {
      chatStatus: status,
      changeSetStatus: changeSetContext.status,
      bufferSize: changeSetContext.getBufferAsArray().length,
      hasPendingResolver: !!pendingConfirmationResolver.current,
      error: error ? String(error) : null
    });
  }, [status, changeSetContext.status, changeSetContext, error]);

  // Handle input submission
  const handleSubmit = (message: string) => {
    setShowInput(false);
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
  };

  // Handle Review Widget Actions
  const handleApprove = async () => {
    const currentDb = dbRef.current;
    const currentAccount = accountRef.current;

    if (!currentDb || !currentAccount || !changeSetContext.currentChangeSetId) {
      return;
    }

    try {
      // Execute changeset atomically
      const repo = new ChangeSetRepository(currentDb);
      await repo.applyChangeSet(changeSetContext.currentChangeSetId);

      // Transition to approved
      changeSetContext.transitionToApproved();

      // Resume AI stream by calling addToolOutput via resolver
      if (pendingConfirmationResolver.current) {
        const decision = buildContextAfterDecision({
          status: "approved",
          results: { summary: "All changes applied successfully" },
        });

        pendingConfirmationResolver.current({
          success: true,
          message: decision,
        });
        pendingConfirmationResolver.current = null;
      }
    } catch (error) {
      console.error("Failed to apply changeset:", error);

      // Transition to execution_failed
      changeSetContext.transitionToExecutionFailed();

      // Resume AI stream with error
      if (pendingConfirmationResolver.current) {
        pendingConfirmationResolver.current({
          success: false,
          error: error instanceof Error ? error.message : "Execution failed",
        });
        pendingConfirmationResolver.current = null;
      }
    }
  };

  const handleReject = (feedback?: string) => {
    // Resume AI stream with feedback FIRST, then transition state
    if (pendingConfirmationResolver.current) {
      const decision = buildContextAfterDecision({
        status: "rejected_with_feedback",
        feedback: feedback || "User requested changes",
      });

      console.log('[AgentTab] Calling resolver with feedback:', decision);

      pendingConfirmationResolver.current({
        success: false,
        feedback: decision,
      });
      pendingConfirmationResolver.current = null;

      // Transition to building state AFTER resuming AI
      changeSetContext.transitionToBuilding();
    } else {
      console.error('[AgentTab] No pending resolver - cannot resume AI stream');
      // If no resolver, just transition back to building
      changeSetContext.transitionToBuilding();
    }
  };

  const handleDiscard = () => {
    // Complete rejection - clear buffer
    changeSetContext.transitionToRejected();

    // Resume AI stream by calling addToolOutput via resolver
    if (pendingConfirmationResolver.current) {
      const decision = buildContextAfterDecision({
        status: "rejected_completely",
      });

      pendingConfirmationResolver.current({
        success: false,
        rejected: true,
        message: decision,
      });
      pendingConfirmationResolver.current = null;
    }
  };

  // Check if AI is processing
  const isProcessing = status === "submitted" || status === "streaming";

  // Show loading state if not initialized
  if (!isInitialized || !account) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Main action - Ask AI */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Button
          className="w-full h-14 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setShowInput(true)}
          disabled={isProcessing || changeSetContext.status === "pending_approval"}
        >
          <MessageSquare className="h-4 w-4 mr-2.5" />
          Tell AI About an Expense
        </Button>
      </motion.div>

      {/* Processing indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl bg-muted p-4"
        >
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
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Processing your request...</p>
            <p className="text-xs text-muted-foreground">AI is preparing a changeset</p>
          </div>
        </motion.div>
      )}

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-destructive/10 border border-destructive/20 p-4"
        >
          <p className="text-sm text-destructive font-medium">
            Error: {error instanceof Error ? error.message : String(error)}
          </p>
        </motion.div>
      )}

      {/* Current ChangeSet */}
      {changeSetContext.status === "pending_approval" && !isProcessing && (
        <ChangeSetReviewWidget
          onApprove={handleApprove}
          onReject={handleReject}
          onDiscard={handleDiscard}
          onModifyRequest={handleReject}
        />
      )}

      {/* Empty state when no changeset */}
      {changeSetContext.status !== "pending_approval" && changeSetContext.status !== "building" && !isProcessing && (
        <EmptyState
          icon={Sparkles}
          title="No pending proposals"
          description="Tell the AI about an expense and it will create a changeset for your review"
        />
      )}

      {/* Building state - AI is revising */}
      {changeSetContext.status === "building" && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl bg-muted p-4"
        >
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
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">AI is revising the changes...</p>
            <p className="text-xs text-muted-foreground">Processing your feedback</p>
          </div>
        </motion.div>
      )}

      {/* Input Modal */}
      <AgentInputModal
        isOpen={showInput}
        onClose={() => setShowInput(false)}
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
      />
    </div>
  );
}
