import type { EncryptedSyncFrame } from './operation.types';

/** The outcome of materialising one accepted operation. */
export type MaterializeResult = 'applied' | 'superseded' | 'tombstoned';

/**
 * The application adapter that applies an accepted operation to local state.
 * Materialisation must be idempotent, must resolve conflicts deterministically
 * (hybrid logical time, then device id — see `convergence.ts`), and must never
 * emit a new local operation for an inbound one: provider source is diagnostic
 * metadata, never part of ordering, and an applied frame does not echo.
 */
export interface OperationMaterializer {
  apply: (frame: EncryptedSyncFrame) => Promise<MaterializeResult>;
}
