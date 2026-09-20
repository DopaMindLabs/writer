/**
 * Local CRDT ↔ row-body reconciliation.
 *
 * Not part of the cloud subsystem: {@link reconcileDocForMount} gates every
 * editor mount regardless of whether any sync provider is configured, and
 * {@link applyPulledBody} is the shared "body wins" primitive the cloud sweep
 * (`src/lib/cloud/reconcile.ts`) also builds on.
 */
export { applyPulledBody } from './applyPulledBody';
export { reconcileDocForMount } from './reconcileDocForMount';
export type {
  MountReconcileAction,
  Reconcilable,
  ReconcileMountOptions,
  ReconcileResult,
} from './reconcile.types';
