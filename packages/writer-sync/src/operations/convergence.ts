import { compareTimestamps } from '../core/hybridLogicalClock';
import type { SyncOperationHeader } from './operation.types';

/**
 * Deterministic convergence order for operations on one entity: hybrid logical
 * time first, then the operation's device id as the tie-breaker, then the
 * operation id as a final total-order guarantee. Every device computes the same
 * winner from the same set of operations, whatever order providers delivered
 * them in — provider arrival order carries no meaning here.
 */
/** The fields that order operations — a frame header, or any seen-record. */
export type OperationOrder = Pick<
  SyncOperationHeader,
  'deviceId' | 'logicalAt' | 'operationId'
>;

export const compareOperations = (
  a: OperationOrder,
  b: OperationOrder,
): number =>
  compareTimestamps(a.logicalAt, b.logicalAt) ||
  String(a.deviceId).localeCompare(String(b.deviceId)) ||
  String(a.operationId).localeCompare(String(b.operationId));

/** Whether `candidate` supersedes `incumbent` for the same entity. */
export const supersedes = (
  candidate: SyncOperationHeader,
  incumbent: SyncOperationHeader,
): boolean => compareOperations(candidate, incumbent) > 0;
