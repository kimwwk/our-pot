"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, AlertCircle } from "lucide-react";
import { useChangeSet } from "@/lib/data/contexts/ChangeSetContext";
import { useSQLite } from "@/lib/data/contexts/SQLiteContext";
import { useAccount } from "@/lib/data/contexts/AccountContext";
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

  // Manage input state locally (v2 API doesn't provide it)
  const [input, setInput] = useState("");

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
      const { toolName, args } = toolCall;

      if (!db || !account) {
        addToolOutput({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: "Database or account not initialized",
        });
        return;
      }

      try {
        // READ TOOLS (Immediate Execution)
        if (toolName === "getCategories") {
          const result = await executeGetCategories(db, account.id);
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "getMembers") {
          const result = await executeGetMembers(db, account.id);
          addToolOutput({
            tool: toolName,
            toolCallId: toolCall.toolCallId,
            output: result,
          });
          return;
        }

        if (toolName === "searchTransactions") {
          const result = await executeSearchTransactions(db, account.id, args);
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
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
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
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
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
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
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
            db,
            account.id,
            {
              addChangeRequest: changeSetContext.addChangeRequest,
              removeChangeRequest: changeSetContext.removeChangeRequest,
            },
            args
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
              transitionToPendingApproval: changeSetContext.transitionToPendingApproval,
              clearBuffer: changeSetContext.clearBuffer,
              getBufferAsArray: changeSetContext.getBufferAsArray,
            },
            args,
            toolCall.toolCallId
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
            transitionToPendingApproval: changeSetContext.transitionToPendingApproval,
            clearBuffer: changeSetContext.clearBuffer,
            getBufferAsArray: changeSetContext.getBufferAsArray,
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

  const handleCompleteReject = () => {
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

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if chat is currently loading/streaming
  const isLoading = status === "submitted" || status === "streaming";

  // Handle input change
  const handleInputChangeWrapper = (value: string) => {
    setInput(value);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInitialized || !account || !input.trim() || isLoading) {
      return;
    }

    const message = input.trim();
    setInput(""); // Clear input immediately

    // Send message with new format
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: message }],
    });
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
              <p className="text-sm font-medium">
                Error: {error instanceof Error ? error.message : String(error)}
              </p>
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
            onChange={handleInputChangeWrapper}
            onSubmit={() => handleSubmit(new Event("submit") as any)}
            disabled={isLoading || changeSetContext.status === "pending_approval"}
          />
        </form>
      </div>
    </div>
  );
}
