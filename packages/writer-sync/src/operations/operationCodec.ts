import { asDeviceId, asOperationId } from '../core/ids';
import type { AccessScopeId } from '../core/providers.types';
import type { HybridLogicalTimestamp } from '../core/hybridLogicalClock';
import {
  SYNC_OPERATION_VERSION,
  type EncryptedSyncFrame,
  type SyncOperationKind,
} from './operation.types';

/**
 * Strict codec for inbound operation frames. A frame arrives from another
 * device through an arbitrary provider and is untrusted input: every field is
 * validated before the frame is admitted, and the payload hash is recomputed —
 * a frame whose ciphertext does not match its declared hash is rejected before
 * anything looks inside it.
 */

export class MalformedFrameError extends Error {
  constructor(reason: string) {
    super(`Malformed sync frame: ${reason}`);
    this.name = 'MalformedFrameError';
  }
}

/** Thrown when a frame's payload does not match its declared hash. */
export class FramePayloadMismatchError extends Error {
  constructor() {
    super('Sync frame payload does not match its declared hash');
    this.name = 'FramePayloadMismatchError';
  }
}

/** Thrown when a frame names a different scope than the receiver expected. */
export class WrongScopeFrameError extends Error {
  constructor() {
    super('Sync frame belongs to a different access scope');
    this.name = 'WrongScopeFrameError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const requireString = (raw: Record<string, unknown>, field: string): string => {
  const value = raw[field];
  if (typeof value !== 'string') throw new MalformedFrameError(`${field} must be a string`);
  return value;
};

const requireNonEmpty = (raw: Record<string, unknown>, field: string): string => {
  const value = requireString(raw, field);
  if (value.length === 0) throw new MalformedFrameError(`${field} must not be empty`);
  return value;
};

const requireNumber = (raw: Record<string, unknown>, field: string): number => {
  const value = raw[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MalformedFrameError(`${field} must be a finite number`);
  }
  return value;
};

const requireTimestamp = (raw: Record<string, unknown>): HybridLogicalTimestamp => {
  const value = raw.logicalAt;
  if (!isRecord(value)) throw new MalformedFrameError('logicalAt must be an object');
  return {
    millis: requireNumber(value, 'millis'),
    counter: requireNumber(value, 'counter'),
  };
};

const requireKind = (raw: Record<string, unknown>): SyncOperationKind => {
  const value = raw.kind;
  if (value !== 'put' && value !== 'delete') {
    throw new MalformedFrameError('kind must be put or delete');
  }
  return value;
};

/**
 * SHA-256 of the empty payload (`hashPayload('')`), precomputed. A delete frame
 * carries no payload, so its hash is a constant — which lets delete framing stay
 * synchronous and therefore safe to run inside a live IndexedDB transaction
 * (Web Crypto suspends one; see the operation-journal middleware). The
 * equivalence is asserted in this module's test suite.
 */
export const EMPTY_PAYLOAD_HASH =
  '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

/** SHA-256 of a frame's base64 payload, as base64. */
export const hashPayload = async (payload: string): Promise<string> => {
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    bytes.buffer.slice(0, bytes.byteLength),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
};

/**
 * Parse an untrusted value into a validated frame. Structural validation only;
 * use {@link verifyFrame} to also check the payload hash and expected scope.
 */
export const decodeFrame = (value: unknown): EncryptedSyncFrame => {
  if (!isRecord(value)) throw new MalformedFrameError('frame must be an object');
  if (value.v !== SYNC_OPERATION_VERSION) {
    throw new MalformedFrameError(`unsupported protocol version ${String(value.v)}`);
  }
  const kind = requireKind(value);
  const payload = requireString(value, 'payload');
  if (kind === 'put' && payload.length === 0) {
    throw new MalformedFrameError('a put frame must carry a payload');
  }
  return {
    v: SYNC_OPERATION_VERSION,
    operationId: asOperationId(requireNonEmpty(value, 'operationId')),
    accessScopeId: requireNonEmpty(value, 'accessScopeId'),
    entityTable: requireNonEmpty(value, 'entityTable'),
    entityId: requireNonEmpty(value, 'entityId'),
    kind,
    deviceId: asDeviceId(requireNonEmpty(value, 'deviceId')),
    logicalAt: requireTimestamp(value),
    keyId: requireString(value, 'keyId'),
    epoch: requireNumber(value, 'epoch'),
    payloadHash: requireString(value, 'payloadHash'),
    payload,
    signature: requireString(value, 'signature'),
  };
};

/**
 * Decode and fully verify an untrusted frame: structure, payload hash, and —
 * when the receiver knows which scope it is syncing — the scope binding.
 */
export const verifyFrame = async (
  value: unknown,
  options: { expectedScope?: AccessScopeId } = {},
): Promise<EncryptedSyncFrame> => {
  const frame = decodeFrame(value);
  if (options.expectedScope !== undefined && frame.accessScopeId !== options.expectedScope) {
    throw new WrongScopeFrameError();
  }
  const hash = await hashPayload(frame.payload);
  if (hash !== frame.payloadHash) throw new FramePayloadMismatchError();
  return frame;
};

