import type { HybridLogicalTimestamp, ReplicatedEntityMetadata } from 'writer-sync/core';

/**
 * What makes a row of a synced-content table framable.
 *
 * Shared rather than private to the journal middleware because a frame is built
 * from such a row in two places — as a write happens, and when a scope is
 * rebuilt for a peer the journal can no longer answer — and the two must agree
 * on what qualifies. A row failing this test is one no frame can honestly
 * describe: its attribution or its logical time is missing.
 */

export type UnknownRow = Record<string, unknown>;

/** A row carrying the replication metadata every synced-content row must have. */
export type JournalledRow = UnknownRow & ReplicatedEntityMetadata & { id: string };

const isTimestamp = (value: unknown): value is { millis: number; counter: number } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { millis?: unknown }).millis === 'number' &&
  typeof (value as { counter?: unknown }).counter === 'number';

/**
 * Whether a row records when it was written. The logical time is routing
 * metadata kept in the clear, so a row read as stored, still sealed, has it too.
 */
export const hasLogicalTime = (
  row: UnknownRow,
): row is UnknownRow & { logicalUpdatedAt: HybridLogicalTimestamp } =>
  isTimestamp(row.logicalUpdatedAt);

/** Whether a row names its scope, which is routing metadata kept in the clear too. */
export const hasAccessScope = (
  row: UnknownRow,
): row is UnknownRow & { accessScopeId: string } => typeof row.accessScopeId === 'string';

export const isJournalledRow = (row: UnknownRow): row is JournalledRow =>
  typeof row.id === 'string' &&
  typeof row.accessScopeId === 'string' &&
  typeof row.createdBy === 'string' &&
  typeof row.updatedBy === 'string' &&
  typeof row.mutationId === 'string' &&
  isTimestamp(row.logicalUpdatedAt);
