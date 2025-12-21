"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react"
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, AlertCircle } from "lucide-react";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
import { allTools } from "@/lib/ai/tools";
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
import { AgentInput } from "./AgentInput";
import { ReviewWidget } from "./ReviewWidget";
import { ChangeSetRepository } from "@/lib/data/repositories/ChangeSetRepository";
import { ulid } from "ulid";
import { buildContextAfterDecision } from "@/lib/ai/prompts";

export function AgentChatPanel() {
  const { db, isInitialized } = useSQLite();
  const { account } = useAccount();
  const changeSetContext = useChangeSet();

  // Ref to store pending confirmation resolver
  const pendingConfirmationResolver = useRef<((result: any) => void) | null>(null);

  const {
    messages,
    input,
    setInput,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
  } = useChat({
    api: "/api/chat",
    headers: {
      "x-openai-api-key": process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
    },
    body: {
      tools: allTools, // Tool schemas
    },
    async onToolCall({ toolCall }) {
      // CLIENT-SIDE TOOL EXECUTION
      const { toolName, args } = toolCall;

      if (!db || !account) {
        return { error: "Database or account not initialized" };
      }

      try {
        // READ TOOLS (Immediate Execution)
        if (toolName === "getCategories") {
          return await executeGetCategories(db, account.id);
        }

        if (toolName === "getMembers") {
          return await executeGetMembers(db, account.id);
        }

        if (toolName === "searchTransactions") {
          return await executeSearchTransactions(db, account.id, args);
        }

        // PROPOSAL TOOLS (Buffered)
        if (toolName === "createTransactionChangeRequest") {
          return await executeCreateTransactionChangeRequest(
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
          );
        }

        if (toolName === "updateTransactionChangeRequest") {
          return await executeUpdateTransactionChangeRequest(
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
          );
        }

        if (toolName === "deleteTransactionChangeRequest") {
          return await executeDeleteTransactionChangeRequest(
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
          );
        }

        if (toolName === "createCategoryChangeRequest") {
          return await executeCreateCategoryChangeRequest(
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
          );
        }

        // CONFIRMATION TOOL (Pause-Resume Pattern)
        if (toolName === "confirmChangeSet") {
          const result = await executeConfirmChangeSet(
            {
              transitionToPendingApproval: changeSetContext.transitionToPendingApproval,
              clearBuffer: changeSetContext.clearBuffer,
              getBufferAsArray: changeSetContext.getBufferAsArray,
            },
            args,
            toolCall.toolCallId
          );

          if (!result.success) {
            return result;
          }

          // PAUSE AI STREAM - Return a promise that resolves when user approves/rejects
          return new Promise((resolve) => {
            pendingConfirmationResolver.current = resolve;
          });
        }

        // RESET TOOL
        if (toolName === "resetChangeSet") {
          return await executeResetChangeSet({
            transitionToPendingApproval: changeSetContext.transitionToPendingApproval,
            clearBuffer: changeSetContext.clearBuffer,
            getBufferAsArray: changeSetContext.getBufferAsArray,
          });
        }

        return { error: `Unknown tool: ${toolName}` };
      } catch (error) {
        console.error(`Tool execution error (${toolName}):`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tool execution failed",
        };
      }
    },
  });

  // Handle Review Widget Actions
  const handleApprove = async () => {
    if (!db || !account || !changeSetContext.currentChangeSetId) {
      return;
    }

    try {
      // Execute changeset atomically
      const repo = new ChangeSetRepository(db);
      await repo.applyChangeSet(changeSetContext.currentChangeSetId);

      // Transition to approved
      changeSetContext.transitionToApproved();

      // Resume AI stream
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

    // Resume AI stream with feedback
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

  const handleCompleteReject = () => {
    // Complete rejection - clear buffer
    changeSetContext.transitionToRejected();

    // Resume AI stream
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

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInitialized || !account) {
      return;
    }
    originalHandleSubmit(e);
  };

  if (!isInitialized || !account) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">AI Agent</h2>
        <p className="text-sm text-muted-foreground">Managing {account.name}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === "user" && (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg px-4 py-2 bg-muted">
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
            </div>
          </motion.div>
        )}

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg bg-destructive/10 border border-destructive/20 p-4"
          >
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Error: {error.message}</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Review Widget (shown when status is pending_approval) */}
      <div className="p-4">
        <AnimatePresence>
          {changeSetContext.status === "pending_approval" && (
            <div className="mb-4">
              <ReviewWidget
                onApprove={handleApprove}
                onReject={handleReject}
                onCompleteReject={handleCompleteReject}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <AgentInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit(new Event("submit") as any)}
            disabled={isLoading || changeSetContext.status === "pending_approval"}
          />
        </form>
      </div>
    </div>
  );
}
