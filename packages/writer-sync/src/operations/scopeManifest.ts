import { compareTimestamps } from '../core/hybridLogicalClock';
import type { HybridLogicalTimestamp } from '../core/hybridLogicalClock';
import type { AccessScopeId } from '../core/providers.types';
import type { DeviceId, OperationId } from '../core/ids';
import type { EncryptedSyncFrame } from './operation.types';
import { compareOperations } from './convergence';

/**
 * Scope manifests and the catch-up plan derived from them, per runbook §24
 * steps 1–3.
 *
 * Two paired devices first say what they hold, then each works out what it is
 * missing and asks for exactly that. The summary is deliberately small — a mark
 * and a count per originating device — so it fits a control frame regardless of
 * journal size, and it discloses nothing about content: an origin id, an
 * operation id and a count reveal that operations exist, not what they say.
 *
 * **Per origin, never one mark per scope.** A scalar mark per scope cannot
 * describe what a device holds once three devices write: an operation from
 * device C, logically older than one from device A, is not implied by a mark
 * naming A's. The same reasoning governs journal compaction — see
 * `journalCompaction.ts`.
 */

/** What one device holds from one originating device, within one scope. */
export interface OriginSummary {
  originDeviceId: DeviceId;
  /** The convergence-newest operation held from this origin. */
  highWaterMark: OperationId;
  logicalAt: HybridLogicalTimestamp;
  /** How many operations from this origin are held — the compact summary. */
  count: number;
}

export interface ScopeManifest {
  accessScopeId: AccessScopeId;
  origins: readonly OriginSummary[];
}

/**
 * A request for one origin's operations within one scope. `after` absent means
 * "everything you hold": that is what a device asks when it has never seen the
 * origin, or when the counts prove it is missing something below its own mark
 * and a mark alone cannot say which.
 */
export interface CatchUpRequest {
  accessScopeId: AccessScopeId;
  originDeviceId: DeviceId;
  after?: HybridLogicalTimestamp;
}

const summariseOrigin = (frames: readonly EncryptedSyncFrame[]): OriginSummary => {
  const newest = frames.reduce((best, frame) =>
    compareOperations(frame, best) > 0 ? frame : best,
  );
  return {
    originDeviceId: newest.deviceId,
    highWaterMark: newest.operationId,
    logicalAt: newest.logicalAt,
    count: frames.length,
  };
};

const groupBy = <T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const bucket = groups.get(key(item));
    if (bucket) bucket.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
};

/** Summarise a journal as one manifest per scope. */
export const buildScopeManifests = (
  frames: readonly EncryptedSyncFrame[],
): ScopeManifest[] =>
  [...groupBy(frames, (frame) => frame.accessScopeId)].map(([accessScopeId, scoped]) => ({
    accessScopeId,
    origins: [...groupBy(scoped, (frame) => String(frame.deviceId))].map(([, byOrigin]) =>
      summariseOrigin(byOrigin),
    ),
  }));

const findOrigin = (
  manifests: readonly ScopeManifest[],
  request: { accessScopeId: AccessScopeId; originDeviceId: DeviceId },
): OriginSummary | undefined =>
  manifests
    .find((manifest) => manifest.accessScopeId === request.accessScopeId)
    ?.origins.find(
      (origin) => String(origin.originDeviceId) === String(request.originDeviceId),
    );

const requestForOrigin = (options: {
  scope: AccessScopeId;
  remote: OriginSummary;
  mine: OriginSummary | undefined;
}): CatchUpRequest[] => {
  const { remote, mine } = options;
  const request = {
    accessScopeId: options.scope,
    originDeviceId: remote.originDeviceId,
  };
  if (mine === undefined) return [{ ...request, after: undefined }];

  const ahead = compareTimestamps(remote.logicalAt, mine.logicalAt) > 0;
  // More operations behind the same mark means a gap a mark cannot name.
  if (!ahead && remote.count > mine.count) return [{ ...request, after: undefined }];
  if (!ahead) return [];
  return [{ ...request, after: mine.logicalAt }];
};

/**
 * What this device must ask its peer for, one request per scope and origin.
 *
 * A peer's summary is never taken as permission: a scope this device cannot
 * decrypt is skipped outright, so a peer cannot induce it to collect ciphertext
 * it has no key for.
 */
export const planCatchUp = (options: {
  local: readonly ScopeManifest[];
  remote: readonly ScopeManifest[];
  /** Whether this device could read a scope the peer is offering. */
  canAccessScope: (accessScopeId: AccessScopeId) => boolean;
}): CatchUpRequest[] =>
  options.remote
    .filter((manifest) => options.canAccessScope(manifest.accessScopeId))
    .flatMap(({ accessScopeId, origins }) =>
      origins.flatMap((remote) =>
        requestForOrigin({
          scope: accessScopeId,
          remote,
          mine: findOrigin(options.local, {
            accessScopeId,
            originDeviceId: remote.originDeviceId,
          }),
        }),
      ),
    );

/**
 * The frames answering one request, in convergence order so the asker can apply
 * them and advance its mark as it goes rather than buffering the whole reply.
 */
export const framesForRequest = (
  frames: readonly EncryptedSyncFrame[],
  request: CatchUpRequest,
): EncryptedSyncFrame[] =>
  frames
    .filter(
      (frame) =>
        frame.accessScopeId === request.accessScopeId &&
        String(frame.deviceId) === String(request.originDeviceId) &&
        (request.after === undefined ||
          compareTimestamps(frame.logicalAt, request.after) > 0),
    )
    .sort(compareOperations);
