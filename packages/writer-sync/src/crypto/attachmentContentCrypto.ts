import type { SyncKeyRing } from './keyResolver';

/**
 * Content encryption for chunked attachments. The blob is sealed **once**, as
 * raw bytes, and the resulting ciphertext is what gets chunked, hashed into a
 * manifest, stored and transferred — so every chunk hash is over ciphertext a
 * peer can verify without holding any key, the same stance `payloadHash` takes.
 *
 * Sealing bytes directly also retires the double inflation the frame path paid
 * for blobs: base64 inside the JSON payload and base64 again around the sealed
 * envelope multiplied a blob by ~1.78; here the ciphertext is the blob plus an
 * IV and a GCM tag.
 *
 * The AAD binds the ciphertext to the row it belongs to — scope, table, entity,
 * key id and epoch — so sealed content lifted from one attachment cannot be
 * replayed as another's, even by a peer who relays chunks faithfully.
 */

/** Thrown when attachment content fails authentication against its row. */
export class AttachmentContentIntegrityError extends Error {
  constructor() {
    super('Attachment content failed authentication');
    this.name = 'AttachmentContentIntegrityError';
  }
}

/** What the sealed content is bound to — the row the manifest travels in. */
export interface AttachmentContentBinding {
  accessScopeId: string;
  entityTable: string;
  entityId: string;
  keyId: string;
  epoch: number;
}

const asBuffer = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

const aad = (binding: AttachmentContentBinding): ArrayBuffer =>
  asBuffer(
    new TextEncoder().encode(
      [
        'lipsum-attachment',
        binding.accessScopeId,
        binding.entityTable,
        binding.entityId,
        binding.keyId,
        String(binding.epoch),
      ].join(':'),
    ),
  );

/** Seal a blob's bytes for chunking: `iv || ciphertext`, binary throughout. */
export const sealAttachmentContent = async (options: {
  ring: SyncKeyRing;
  binding: AttachmentContentBinding;
  content: Uint8Array;
}): Promise<Uint8Array> => {
  const { ring, binding, content } = options;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(binding) },
      ring.contentKey,
      asBuffer(content),
    ),
  );
  const packed = new Uint8Array(iv.length + data.length);
  packed.set(iv, 0);
  packed.set(data, iv.length);
  return packed;
};

/** Open sealed attachment content back into the blob's bytes. */
export const openAttachmentContent = async (options: {
  ring: SyncKeyRing;
  binding: AttachmentContentBinding;
  sealed: Uint8Array;
}): Promise<Uint8Array> => {
  const { ring, binding, sealed } = options;
  const iv = sealed.slice(0, 12);
  const data = sealed.slice(12);
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: asBuffer(iv), additionalData: aad(binding) },
        ring.contentKey,
        asBuffer(data),
      ),
    );
  } catch {
    throw new AttachmentContentIntegrityError();
  }
};
