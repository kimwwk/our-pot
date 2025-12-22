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
import {
  executeGetCategories,
  executeGetMembers,
  executeSearchTransactions,
  executeCreateTransactionChangeRequest,
  executeUpdateTransactionChangeRequest,
  executeDeleteTransactionChangeRequest,
  executeCreateCategoryChangeRequest,
  executeConfirmChangeSet,
  executeResetChangeSet,
} from "@/lib/ai/tools";
import { ChangeSetRepository } from "@/lib/data/repositories/ChangeSetRepository";
import { buildContextAfterDecision } from "@/lib/ai/prompts";
import { AgentInputModal } from "./AgentInputModal";
import { ChangeSetReviewWidget } from "./ChangeSetReviewWidget";

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
      // CLIENT-SIDE TOOL EXECUTION
      const { toolName, input: args } = toolCall;
      // Cast args to any to avoid type errors - tools validate at runtime
      const typedArgs = args as any;

      // Use refs to get current values (avoid stale closures)
      const currentDb = dbRef.current;
      const currentAccount = accountRef.current;
      const currentIsInitialized = isInitializedRef.current;

      console.log(`[Tool Call] ${toolName}`, {
        hasDb: !!currentDb,
        hasAccount: !!currentAccount,
        isInitialized: currentIsInitialized,
        args: typedArgs
      });

      if (!currentDb || !currentAccount) {
        console.error(`[Tool Call Error] Missing: ${!currentDb ? 'db' : ''} ${!currentAccount ? 'account' : ''}`);
        addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: `Database or account not initialized (db=${!!currentDb}, account=${!!currentAccount})`,
        });
        return;
      }

      try {
        // READ TOOLS (Immediate Execution)
        if (toolName === "getCategories") {
          const result = await executeGetCategories(currentDb, currentAccount.id);
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "getMembers") {
          const result = await executeGetMembers(currentDb, currentAccount.id);
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "searchTransactions") {
          const result = await executeSearchTransactions(
            currentDb,
            currentAccount.id,
            typedArgs
          );
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        // PROPOSAL TOOLS (Buffered)
        if (toolName === "createTransactionChangeRequest") {
          const result = await executeCreateTransactionChangeRequest(
            currentDb,
            currentAccount.id,
            {
              addChangeRequest: changeSetContextRef.current.addChangeRequest,
              removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            },
            typedArgs
          );
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "updateTransactionChangeRequest") {
          const result = await executeUpdateTransactionChangeRequest(
            currentDb,
            currentAccount.id,
            {
              addChangeRequest: changeSetContextRef.current.addChangeRequest,
              removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            },
            typedArgs
          );
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "deleteTransactionChangeRequest") {
          const result = await executeDeleteTransactionChangeRequest(
            currentDb,
            currentAccount.id,
            {
              addChangeRequest: changeSetContextRef.current.addChangeRequest,
              removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            },
            typedArgs
          );
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "createCategoryChangeRequest") {
          const result = await executeCreateCategoryChangeRequest(
            currentDb,
            currentAccount.id,
            {
              addChangeRequest: changeSetContextRef.current.addChangeRequest,
              removeChangeRequest: changeSetContextRef.current.removeChangeRequest,
            },
            typedArgs
          );
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        // CONFIRMATION TOOL (Pause-Resume Pattern)
        if (toolName === "confirmChangeSet") {
          const result = await executeConfirmChangeSet(
            {
              transitionToPendingApproval: changeSetContextRef.current.transitionToPendingApproval,
              clearBuffer: changeSetContextRef.current.clearBuffer,
              getBufferAsArray: changeSetContextRef.current.getBufferAsArray,
            },
            typedArgs,
            toolCall.toolCallId,
            dbRef.current // Pass database instance
          );

          if (!result.success) {
            addToolOutput({
              tool: toolName,
              toolCallId: toolCall.toolCallId,
              state: "output-error",
              errorText: result.error || "Failed to confirm changeset",
            });
            return;
          }

          // Store the tool call ID so handleApprove/handleReject can send the output later
          pendingConfirmationResolver.current = (resultData: any) => {
            addToolOutput({
              tool: toolName,
              toolCallId: toolCall.toolCallId,
              output: resultData,
            });
          };

          // DO NOT call addToolOutput here - widget will trigger it via handleApprove/handleReject
          return;
        }

        // RESET TOOL
        if (toolName === "resetChangeSet") {
          const result = await executeResetChangeSet({
            transitionToPendingApproval: changeSetContextRef.current.transitionToPendingApproval,
            clearBuffer: changeSetContextRef.current.clearBuffer,
            getBufferAsArray: changeSetContextRef.current.getBufferAsArray,
          });
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: `Unknown tool: ${toolName}`,
        });
      } catch (error) {
        console.error(`Tool execution error (${toolName}):`, error);
        addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: error instanceof Error ? error.message : "Tool execution failed",
        });
      }
    },
  });

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
    // Iterative refinement - return to building state
    changeSetContext.transitionToBuilding();

    // Resume AI stream with feedback by calling addToolOutput via resolver
    if (pendingConfirmationResolver.current) {
      const decision = buildContextAfterDecision({
        status: "rejected_with_feedback",
        feedback: feedback || "User requested changes",
      });

      pendingConfirmationResolver.current({
        success: false,
        feedback: decision,
      });
      pendingConfirmationResolver.current = null;
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
          <h1 className="text-xl font-semibold text-foreground">AI Agent</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Managing {account.name}</p>
      </div>

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
      {changeSetContext.status !== "pending_approval" && !isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-muted/50 border border-dashed border-border p-8 text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background border border-border">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <p className="font-medium text-foreground text-sm mb-1">No pending proposals</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tell the AI about an expense and it will create a changeset for your review
          </p>
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
