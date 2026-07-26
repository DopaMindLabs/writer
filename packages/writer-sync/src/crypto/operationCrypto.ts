import { tagBinary, untagBinary, toBase64, fromBase64 } from './binaryJson';
import type { SyncOperationHeader } from '../operations/operation.types';
import type { SyncKeyRing } from './keyResolver';

/**
 * Payload encryption for operation frames. One logical operation is encrypted
 * once; every provider then carries the identical ciphertext. The AES-GCM AAD
 * binds the payload to its routing header — operation id, scope, entity, kind,
 * device, key id and epoch — so a frame whose header was altered in transit
 * fails authentication on the receiving device.
 */

/** Thrown when a payload fails authentication against its header. */
export class OperationPayloadIntegrityError extends Error {
  constructor() {
    super('Operation payload failed authentication');
    this.name = 'OperationPayloadIntegrityError';
  }
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

type BindableHeader = Omit<SyncOperationHeader, 'payloadHash' | 'logicalAt'>;

const aad = (header: BindableHeader): ArrayBuffer =>
  asBuffer(
    new TextEncoder().encode(
      [
        'lipsum-op',
        String(header.v),
        String(header.operationId),
        header.accessScopeId,
        header.entityTable,
        header.entityId,
        header.kind,
        String(header.deviceId),
        header.keyId,
        String(header.epoch),
      ].join(':'),
    ),
  );

/** Seal an entity's content fields into a frame payload (base64). */
export const sealOperationPayload = async (
  ring: SyncKeyRing,
  header: BindableHeader,
  content: Record<string, unknown>,
): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(await tagBinary(content)));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(header) },
      ring.contentKey,
      asBuffer(bytes),
    ),
  );
  const packed = new Uint8Array(iv.length + data.length);
  packed.set(iv, 0);
  packed.set(data, iv.length);
  return toBase64(packed);
};

/** Open a frame payload back into the entity's content fields. */
export const openOperationPayload = async (
  ring: SyncKeyRing,
  header: BindableHeader,
  payload: string,
): Promise<Record<string, unknown>> => {
  const packed = fromBase64(payload);
  const iv = packed.slice(0, 12);
  const data = packed.slice(12);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(header) },
      ring.contentKey,
      asBuffer(data),
    );
  } catch {
    throw new OperationPayloadIntegrityError();
  }
  return untagBinary(
    JSON.parse(new TextDecoder().decode(new Uint8Array(plain))),
  ) as Record<string, unknown>;
};
