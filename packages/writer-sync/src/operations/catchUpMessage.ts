import { asDeviceId, asOperationId } from '../core/ids';
import type { DeviceId, OperationId } from '../core/ids';
import type { AccessScopeId } from '../core/providers.types';
import type { HybridLogicalTimestamp } from '../core/hybridLogicalClock';
import type { AttachmentChunkManifest, EncryptedSyncFrame } from './operation.types';
import { decodeFrame } from './operationCodec';
import { MAX_CHUNK_COUNT, validateChunkManifest } from './attachmentChunking';
import type { CatchUpRequest, ScopeManifest } from './scopeManifest';

/**
 * The control messages two paired devices exchange to catch up, and their strict
 * codec.
 *
 * Everything arriving over a peer channel is untrusted, however well the pairing
 * authenticated the peer: an authenticated device may still be compromised, so
 * every message is validated structurally and bounded before it reaches the
 * exchange. The bounds are the flood defence from the threat model — a peer
 * cannot make this device allocate for a million origins by claiming to have
 * them.
 *
 * Messages are JSON over the data channel. The frames they carry stay opaque:
 * this codec validates their envelope and never decrypts a payload.
 */

export const CATCH_UP_PROTOCOL_VERSION = 1;

/** Bounds on one message. Anything larger is a flood, not a sync. */
export const MAX_MANIFESTS = 256;
export const MAX_ORIGINS_PER_SCOPE = 256;
export const MAX_REQUESTS = 1024;
export const MAX_FRAMES_PER_MESSAGE = 64;
export const MAX_ACKNOWLEDGEMENTS = 1024;
export const MAX_ATTACHMENT_OFFERS = 256;
export const MAX_REQUESTED_CHUNKS = 256;

/** How far one peer has read one origin within one scope. */
export interface OperationAcknowledgement {
  accessScopeId: AccessScopeId;
  originDeviceId: DeviceId;
  operationId: OperationId;
}

/** One chunk in flight. `bytes` is base64url — JSON carries no binary. */
export interface AttachmentChunkPayload {
  attachmentId: string;
  index: number;
  bytes: string;
}

export type CatchUpMessage =
  | { v: typeof CATCH_UP_PROTOCOL_VERSION; kind: 'manifest'; manifests: ScopeManifest[] }
  | { v: typeof CATCH_UP_PROTOCOL_VERSION; kind: 'request'; requests: CatchUpRequest[] }
  | {
      v: typeof CATCH_UP_PROTOCOL_VERSION;
      kind: 'attachment-offer';
      manifests: AttachmentChunkManifest[];
    }
  | {
      v: typeof CATCH_UP_PROTOCOL_VERSION;
      kind: 'attachment-request';
      attachmentId: string;
      indices: number[];
    }
  | {
      v: typeof CATCH_UP_PROTOCOL_VERSION;
      kind: 'attachment-chunk';
      chunk: AttachmentChunkPayload;
    }
  | {
      v: typeof CATCH_UP_PROTOCOL_VERSION;
      kind: 'frames';
      frames: EncryptedSyncFrame[];
      /** True on the batch that completes this peer's reply. */
      final: boolean;
    }
  | {
      v: typeof CATCH_UP_PROTOCOL_VERSION;
      kind: 'ack';
      acknowledgements: OperationAcknowledgement[];
    };

export class MalformedCatchUpMessageError extends Error {
  constructor(reason: string) {
    super(`Malformed catch-up message: ${reason}`);
    this.name = 'MalformedCatchUpMessageError';
  }
}

const fail = (reason: string): never => {
  throw new MalformedCatchUpMessageError(reason);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireArray = (value: unknown, field: string, max: number): unknown[] => {
  if (!Array.isArray(value)) return fail(`${field} must be an array`);
  if (value.length > max) return fail(`${field} exceeds ${String(max)} entries`);
  return value;
};

const requireText = (raw: Record<string, unknown>, field: string): string => {
  const value = raw[field];
  if (typeof value !== 'string' || value.length === 0) {
    return fail(`${field} must be a non-empty string`);
  }
  return value;
};

const requireCount = (raw: Record<string, unknown>, field: string): number => {
  const value = raw[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fail(`${field} must be a non-negative integer`);
  }
  return value;
};

const requireTimestamp = (value: unknown, field: string): HybridLogicalTimestamp => {
  if (!isRecord(value)) return fail(`${field} must be an object`);
  const millis = value.millis;
  const counter = value.counter;
  if (typeof millis !== 'number' || !Number.isFinite(millis)) {
    return fail(`${field}.millis must be a finite number`);
  }
  if (typeof counter !== 'number' || !Number.isFinite(counter)) {
    return fail(`${field}.counter must be a finite number`);
  }
  return { millis, counter };
};

const decodeObject = (value: unknown, field: string): Record<string, unknown> =>
  isRecord(value) ? value : fail(`${field} must be an object`);

const decodeOrigin = (value: unknown) => {
  const raw = decodeObject(value, 'origin');
  return {
    originDeviceId: asDeviceId(requireText(raw, 'originDeviceId')),
    highWaterMark: asOperationId(requireText(raw, 'highWaterMark')),
    logicalAt: requireTimestamp(raw.logicalAt, 'logicalAt'),
    count: requireCount(raw, 'count'),
  };
};

const decodeManifest = (value: unknown): ScopeManifest => {
  const raw = decodeObject(value, 'manifest');
  return {
    accessScopeId: requireText(raw, 'accessScopeId'),
    origins: requireArray(raw.origins, 'origins', MAX_ORIGINS_PER_SCOPE).map(decodeOrigin),
  };
};

const decodeRequest = (value: unknown): CatchUpRequest => {
  const raw = decodeObject(value, 'request');
  return {
    accessScopeId: requireText(raw, 'accessScopeId'),
    originDeviceId: asDeviceId(requireText(raw, 'originDeviceId')),
    after:
      raw.after === undefined || raw.after === null
        ? undefined
        : requireTimestamp(raw.after, 'after'),
  };
};

const decodeAcknowledgement = (value: unknown): OperationAcknowledgement => {
  const raw = decodeObject(value, 'acknowledgement');
  return {
    accessScopeId: requireText(raw, 'accessScopeId'),
    originDeviceId: asDeviceId(requireText(raw, 'originDeviceId')),
    operationId: asOperationId(requireText(raw, 'operationId')),
  };
};

const decodeAttachmentManifest = (value: unknown): AttachmentChunkManifest => {
  const raw = decodeObject(value, 'attachment manifest');
  const hashes = requireArray(raw.chunkHashes, 'chunkHashes', MAX_CHUNK_COUNT).map(
    (hash, index) =>
      typeof hash === 'string' && hash.length > 0
        ? hash
        : fail(`chunkHashes[${String(index)}] must be a non-empty string`),
  );
  const manifest: AttachmentChunkManifest = {
    attachmentId: requireText(raw, 'attachmentId'),
    contentHash: requireText(raw, 'contentHash'),
    totalBytes: requireCount(raw, 'totalBytes'),
    chunkBytes: requireCount(raw, 'chunkBytes'),
    chunkCount: requireCount(raw, 'chunkCount'),
    chunkHashes: hashes,
  };
  // The manifest's own ceilings and internal consistency, before a byte is
  // allocated for it — a peer chooses every number in here.
  validateChunkManifest(manifest);
  return manifest;
};

const decodeChunkIndex = (value: unknown, index: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : fail(`indices[${String(index)}] must be a non-negative integer`);

const decodeAttachmentBody = (
  raw: Record<string, unknown>,
): CatchUpMessage | undefined => {
  const v = CATCH_UP_PROTOCOL_VERSION;
  switch (raw.kind) {
    case 'attachment-offer':
      return {
        v,
        kind: 'attachment-offer',
        manifests: requireArray(raw.manifests, 'manifests', MAX_ATTACHMENT_OFFERS).map(
          decodeAttachmentManifest,
        ),
      };
    case 'attachment-request':
      return {
        v,
        kind: 'attachment-request',
        attachmentId: requireText(raw, 'attachmentId'),
        indices: requireArray(raw.indices, 'indices', MAX_REQUESTED_CHUNKS).map(
          decodeChunkIndex,
        ),
      };
    case 'attachment-chunk': {
      const chunk = decodeObject(raw.chunk, 'chunk');
      return {
        v,
        kind: 'attachment-chunk',
        chunk: {
          attachmentId: requireText(chunk, 'attachmentId'),
          index: requireCount(chunk, 'index'),
          bytes: requireText(chunk, 'bytes'),
        },
      };
    }
    default:
      return undefined;
  }
};

const decodeBody = (raw: Record<string, unknown>): CatchUpMessage => {
  const v = CATCH_UP_PROTOCOL_VERSION;
  switch (raw.kind) {
    case 'manifest':
      return {
        v,
        kind: 'manifest',
        manifests: requireArray(raw.manifests, 'manifests', MAX_MANIFESTS).map(decodeManifest),
      };
    case 'request':
      return {
        v,
        kind: 'request',
        requests: requireArray(raw.requests, 'requests', MAX_REQUESTS).map(decodeRequest),
      };
    case 'frames':
      return {
        v,
        kind: 'frames',
        frames: requireArray(raw.frames, 'frames', MAX_FRAMES_PER_MESSAGE).map(decodeFrame),
        final: raw.final === true,
      };
    case 'ack':
      return {
        v,
        kind: 'ack',
        acknowledgements: requireArray(
          raw.acknowledgements,
          'acknowledgements',
          MAX_ACKNOWLEDGEMENTS,
        ).map(decodeAcknowledgement),
      };
    default:
      return (
        decodeAttachmentBody(raw) ?? fail(`unsupported kind ${String(raw.kind)}`)
      );
  }
};

export const encodeCatchUpMessage = (message: CatchUpMessage): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(message));

/** Parse untrusted bytes from a peer into a validated, bounded message. */
export const decodeCatchUpMessage = (bytes: Uint8Array): CatchUpMessage => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail('not valid JSON');
  }
  const raw = decodeObject(parsed, 'message');
  if (raw.v !== CATCH_UP_PROTOCOL_VERSION) {
    return fail(`unsupported protocol version ${String(raw.v)}`);
  }
  return decodeBody(raw);
};
