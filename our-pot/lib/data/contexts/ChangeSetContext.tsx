"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ulid } from "ulid";

// ChangeRequest structure for the keyed buffer
export interface ChangeRequest {
  id: string; // ULID for the change request
  changesetId?: string; // Parent changeset ID (set when transitioning to pending_approval)
  operationType: "create" | "update" | "delete";
  entityType: "transaction" | "category" | "account" | "member";
  entityId: string | null; // null for creates, entityId for updates/deletes
  currentData: string | null; // JSON snapshot of current state (for updates/deletes)
  proposedData: string | null; // JSON of proposed changes
  executionOrder: number; // Sequence number for deterministic execution
  createdAt: string;
}

// Changeset status types
export type ChangeSetStatus = "idle" | "building" | "pending_approval" | "executing" | "approved" | "execution_failed" | "rejected";

// Changeset metadata
export interface ChangeSetMetadata {
  title: string;
  description?: string;
  toolCallId?: string;
}

// Context data interface
export interface ChangeSetContextData {
  // State
  status: ChangeSetStatus;
  keyedBuffer: Map<string, ChangeRequest>; // Key = entityType:entityId
  metadata: ChangeSetMetadata | null;
  currentChangeSetId: string | null;

  // Actions
  addChangeRequest: (key: string, request: Omit<ChangeRequest, "id" | "createdAt" | "executionOrder">) => void;
  removeChangeRequest: (key: string) => void;
  clearBuffer: () => void;
  transitionToPendingApproval: (metadata: ChangeSetMetadata) => string; // Returns changeset ID
  transitionToBuilding: () => void;
  transitionToApproved: () => void;
  transitionToRejected: (reason?: string) => void;
  transitionToExecutionFailed: () => void;

  // Utility
  getBufferAsArray: () => ChangeRequest[];
}

const ChangeSetContext = createContext<ChangeSetContextData>({
  status: "idle",
  keyedBuffer: new Map(),
  metadata: null,
  currentChangeSetId: null,
  addChangeRequest: () => {},
  removeChangeRequest: () => {},
  clearBuffer: () => {},
  transitionToPendingApproval: () => "",
  transitionToBuilding: () => {},
  transitionToApproved: () => {},
  transitionToRejected: () => {},
  transitionToExecutionFailed: () => {},
  getBufferAsArray: () => [],
});

export const useChangeSet = () => useContext(ChangeSetContext);

export const ChangeSetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ChangeSetStatus>("idle");
  const [keyedBuffer, setKeyedBuffer] = useState<Map<string, ChangeRequest>>(new Map());
  const [metadata, setMetadata] = useState<ChangeSetMetadata | null>(null);
  const [currentChangeSetId, setCurrentChangeSetId] = useState<string | null>(null);

  /**
   * Add or update a change request in the keyed buffer (upsert semantics)
   * Key format: "entityType:entityId"
   */
  const addChangeRequest = useCallback((key: string, request: Omit<ChangeRequest, "id" | "createdAt" | "executionOrder">) => {
    setKeyedBuffer((prev) => {
      const newBuffer = new Map(prev);
      const existingRequest = newBuffer.get(key);

      // Calculate execution order based on current buffer size
      const executionOrder = existingRequest ? existingRequest.executionOrder : newBuffer.size;

      const changeRequest: ChangeRequest = {
        id: ulid(),
        createdAt: new Date().toISOString(),
        executionOrder,
        ...request,
      };

      newBuffer.set(key, changeRequest);
      return newBuffer;
    });

    // Auto-transition to building if currently idle
    if (status === "idle") {
      setStatus("building");
    }
  }, [status]);

  /**
   * Remove a change request from the keyed buffer (DISCARD action)
   */
  const removeChangeRequest = useCallback((key: string) => {
    setKeyedBuffer((prev) => {
      const newBuffer = new Map(prev);
      newBuffer.delete(key);
      return newBuffer;
    });
  }, []);

  /**
   * Clear the entire keyed buffer and reset to idle
   */
  const clearBuffer = useCallback(() => {
    setKeyedBuffer(new Map());
    setMetadata(null);
    setCurrentChangeSetId(null);
    setStatus("idle");
  }, []);

  /**
   * Transition from building to pending_approval
   * Snapshots the keyed buffer and prepares for user review
   */
  const transitionToPendingApproval = useCallback((meta: ChangeSetMetadata) => {
    const changesetId = ulid();
    setCurrentChangeSetId(changesetId);
    setMetadata(meta);
    setStatus("pending_approval");
    return changesetId;
  }, []);

  /**
   * Transition from pending_approval back to building (iterative refinement)
   * Restores the keyed buffer for corrections
   */
  const transitionToBuilding = useCallback(() => {
    setStatus("building");
  }, []);

  /**
   * Transition to approved after successful execution
   */
  const transitionToApproved = useCallback(() => {
    setStatus("approved");
    // Clear buffer after successful approval
    setTimeout(() => {
      clearBuffer();
    }, 1000); // Small delay to allow UI to update
  }, [clearBuffer]);

  /**
   * Transition to rejected (complete rejection, not iterative correction)
   */
  const transitionToRejected = useCallback((reason?: string) => {
    setStatus("rejected");
    // Clear buffer after rejection
    setTimeout(() => {
      clearBuffer();
    }, 1000);
  }, [clearBuffer]);

  /**
   * Transition to execution_failed after atomic rollback
   * Keeps buffer intact for AI to analyze and fix
   */
  const transitionToExecutionFailed = useCallback(() => {
    setStatus("execution_failed");
    // Transition back to building for AI to fix
    setTimeout(() => {
      setStatus("building");
    }, 500);
  }, []);

  /**
   * Get the keyed buffer as an array sorted by execution order
   */
  const getBufferAsArray = useCallback(() => {
    return Array.from(keyedBuffer.values()).sort((a, b) => a.executionOrder - b.executionOrder);
  }, [keyedBuffer]);

  return (
    <ChangeSetContext.Provider
      value={{
        status,
        keyedBuffer,
        metadata,
        currentChangeSetId,
        addChangeRequest,
        removeChangeRequest,
        clearBuffer,
        transitionToPendingApproval,
        transitionToBuilding,
        transitionToApproved,
        transitionToRejected,
        transitionToExecutionFailed,
        getBufferAsArray,
      }}
    >
      {children}
    </ChangeSetContext.Provider>
  );
};
