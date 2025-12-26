"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ulid } from "ulid";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { ChangeSetRepository } from "../repositories/ChangeSetRepository";
import type { ChangeSet as DbChangeSet, ChangeRequest as DbChangeRequest } from "../types";
import type { ChangeRequest, ChangeSetStatus, ChangeSetMetadata } from "@/lib/ai/types";

// Re-export types for backward compatibility
export type { ChangeRequest, ChangeSetStatus, ChangeSetMetadata };

// Context data interface
export interface ChangeSetContextData {
  // State
  status: ChangeSetStatus;
  keyedBuffer: Map<string, ChangeRequest>; // Key = entityType:entityId
  metadata: ChangeSetMetadata | null;
  currentChangeSetId: string | null;

  // Actions
  addChangeRequest: (key: string, request: Omit<ChangeRequest, "id" | "createdAt" | "executionOrder" | "changesetId">) => void;
  removeChangeRequest: (key: string) => void;
  clearBuffer: () => void;
  transitionToPendingApproval: (metadata: ChangeSetMetadata, db: SQLiteDBConnection) => Promise<string>; // Returns changeset ID
  transitionToBuilding: () => void;
  transitionToApproved: () => void;
  transitionToRejected: (reason?: string) => void;
  transitionToExecutionFailed: () => void;

  // Utility
  getBufferAsArray: () => ChangeRequest[];
  getNextExecutionOrder: () => number;
}

const ChangeSetContext = createContext<ChangeSetContextData>({
  status: "idle",
  keyedBuffer: new Map(),
  metadata: null,
  currentChangeSetId: null,
  addChangeRequest: () => {},
  removeChangeRequest: () => {},
  clearBuffer: () => {},
  transitionToPendingApproval: async () => "",
  transitionToBuilding: () => {},
  transitionToApproved: () => {},
  transitionToRejected: () => {},
  transitionToExecutionFailed: () => {},
  getBufferAsArray: () => [],
  getNextExecutionOrder: () => 0,
});

export const useChangeSet = () => useContext(ChangeSetContext);

export const ChangeSetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ChangeSetStatus>("idle");
  const [keyedBuffer, setKeyedBuffer] = useState<Map<string, ChangeRequest>>(new Map());
  const [metadata, setMetadata] = useState<ChangeSetMetadata | null>(null);
  const [currentChangeSetId, setCurrentChangeSetId] = useState<string | null>(null);
  const [nextExecutionOrder, setNextExecutionOrder] = useState<number>(0);

  /**
   * Get next execution order (current value, doesn't increment)
   */
  const getNextExecutionOrder = useCallback(() => {
    return nextExecutionOrder;
  }, [nextExecutionOrder]);

  /**
   * Add or update a change request in the keyed buffer (upsert semantics)
   * Key format: "entityType:entityId"
   */
  const addChangeRequest = useCallback((key: string, request: Omit<ChangeRequest, "id" | "createdAt" | "executionOrder" | "changesetId">) => {
    setKeyedBuffer((prev) => {
      const newBuffer = new Map(prev);
      const existingRequest = newBuffer.get(key);
      const isNew = !existingRequest;

      // For updates, preserve execution order; for new entries, assign next order
      const executionOrder = existingRequest ? existingRequest.executionOrder : nextExecutionOrder;

      const changeRequest: ChangeRequest = {
        id: ulid(),
        createdAt: new Date().toISOString(),
        executionOrder,
        ...request,
      };

      newBuffer.set(key, changeRequest);

      // Increment execution order counter if this was a new entry
      if (isNew) {
        setNextExecutionOrder(nextExecutionOrder + 1);
      }

      return newBuffer;
    });

    // Auto-transition to building if currently idle
    if (status === "idle") {
      setStatus("building");
    }
  }, [status, nextExecutionOrder]);

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
    setNextExecutionOrder(0); // Reset execution order counter
    setStatus("idle");
  }, []);

  /**
   * Transition from building to pending_approval
   * Snapshots the keyed buffer, persists to database, and prepares for user review
   */
  const transitionToPendingApproval = useCallback(async (meta: ChangeSetMetadata, db: SQLiteDBConnection) => {
    const changesetId = ulid();
    const requests = Array.from(keyedBuffer.values()).sort((a, b) => a.executionOrder - b.executionOrder);

    // Create changeset object for database
    const changeset: DbChangeSet = {
      id: changesetId,
      status: 'pending_approval',
      source: 'ai',
      title: meta.title,
      description: meta.description,
      tool_call_id: meta.toolCallId,
      proposed_at: new Date().toISOString(),
    };

    // Convert frontend ChangeRequest format to database format
    // Note: currentData and proposedData are objects in memory, JSON strings in DB
    const dbRequests: DbChangeRequest[] = requests.map(req => ({
      id: req.id,
      changeset_id: changesetId,
      operation_type: req.operationType,
      entity_type: req.entityType,
      entity_id: req.entityId || undefined,
      current_data: req.currentData ? JSON.stringify(req.currentData) : undefined,
      proposed_data: req.proposedData ? JSON.stringify(req.proposedData) : undefined,
      execution_order: req.executionOrder,
      created_at: req.createdAt,
    }));

    // Persist to database
    const repo = new ChangeSetRepository(db);
    await repo.create(changeset, dbRequests);

    // Update state
    setCurrentChangeSetId(changesetId);
    setMetadata(meta);
    setStatus("pending_approval");

    return changesetId;
  }, [keyedBuffer]);

  /**
   * Transition from pending_approval back to building (iterative refinement)
   * Restores the keyed buffer for corrections
   */
  const transitionToBuilding = useCallback(() => {
    console.log('[ChangeSetContext] Transitioning to building (iterative refinement)', {
      previousStatus: status,
      bufferSize: keyedBuffer.size
    });
    setStatus("building");
  }, [status, keyedBuffer]);

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
        getNextExecutionOrder,
      }}
    >
      {children}
    </ChangeSetContext.Provider>
  );
};
