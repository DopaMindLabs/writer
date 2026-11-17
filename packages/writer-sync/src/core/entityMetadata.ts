import type { AccessScopeId } from './providers.types';
import type { OperationId, PrincipalId } from './ids';
import type { HybridLogicalTimestamp } from './hybridLogicalClock';

/**
 * Provider-neutral routing, attribution and convergence metadata carried by every
 * replicable entity. Provider ids never appear here — a realm id, a WebRTC room,
 * a workspace id all belong to an adapter, not to a domain entity.
 *
 * **Disclosure boundary (deliberate):**
 * - `accessScopeId`, `mutationId` and `logicalUpdatedAt` are *routing and
 *   convergence* metadata. A provider must read them **before** it can decrypt an
 *   entity (to route the frame to a scope, deduplicate by operation, and order
 *   changes), so they travel in the clear. They reveal only that *some* change
 *   happened to *some* entity in a scope at a logical time — never its content.
 * - `createdBy` and `updatedBy` are *attribution content*. They name a person and
 *   are sealed with the rest of the row; a provider never sees them.
 *
 * `createdBy`/`updatedBy` are {@link PrincipalId}s and must never be mapped onto a
 * provider's authorisation field (Dexie's `owner`): attribution records who wrote
 * a row, not who may.
 */
export interface ReplicatedEntityMetadata {
  accessScopeId: AccessScopeId;
  createdBy: PrincipalId;
  updatedBy: PrincipalId;
  mutationId: OperationId;
  logicalUpdatedAt: HybridLogicalTimestamp;
}

/** Inputs for the first write of an entity. */
export interface EntityCreationInput {
  accessScopeId: AccessScopeId;
  principal: PrincipalId;
  mutationId: OperationId;
  at: HybridLogicalTimestamp;
}

/**
 * Metadata for a newly created entity: the principal is both author and last
 * editor, and the scope is fixed at creation.
 */
export const createEntityMetadata = (
  input: EntityCreationInput,
): ReplicatedEntityMetadata => ({
  accessScopeId: input.accessScopeId,
  createdBy: input.principal,
  updatedBy: input.principal,
  mutationId: input.mutationId,
  logicalUpdatedAt: input.at,
});

/** Inputs for a subsequent material change to an entity. */
export interface EntityUpdateInput {
  principal: PrincipalId;
  mutationId: OperationId;
  at: HybridLogicalTimestamp;
}

/**
 * Metadata after a material change: `createdBy` and the scope are preserved from
 * the previous state; the editor, mutation id and logical time advance. Changing
 * scope is an explicit adapter concern, never a silent side effect of an update.
 */
export const updateEntityMetadata = (
  previous: ReplicatedEntityMetadata,
  input: EntityUpdateInput,
): ReplicatedEntityMetadata => ({
  accessScopeId: previous.accessScopeId,
  createdBy: previous.createdBy,
  updatedBy: input.principal,
  mutationId: input.mutationId,
  logicalUpdatedAt: input.at,
});
