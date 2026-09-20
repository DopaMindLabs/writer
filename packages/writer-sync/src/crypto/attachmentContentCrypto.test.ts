import { describe, expect, it } from 'vitest';
import type { SyncKeyRing } from './keyResolver';
import {
  AttachmentContentIntegrityError,
  openAttachmentContent,
  sealAttachmentContent,
  type AttachmentContentBinding,
} from './attachmentContentCrypto';

const ringOf = async (): Promise<SyncKeyRing> => ({
  epoch: 1,
  contentKey: await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]),
  fingerprint: new Uint8Array([1, 2, 3]),
});

const binding = (overrides: Partial<AttachmentContentBinding> = {}): AttachmentContentBinding => ({
  accessScopeId: 'scope-1',
  entityTable: 'noteAttachments',
  entityId: 'att-1',
  keyId: 'key-1',
  epoch: 1,
  ...overrides,
});

const content = Uint8Array.from({ length: 64 }, (_, index) => index % 251);

describe('sealAttachmentContent / openAttachmentContent', () => {
  it('round-trips the exact bytes', async () => {
    const ring = await ringOf();
    const sealed = await sealAttachmentContent({ ring, binding: binding(), content });
    const opened = await openAttachmentContent({ ring, binding: binding(), sealed });
    expect(opened).toEqual(content);
  });

  it('costs an IV and a tag, not a base64 multiple', async () => {
    const ring = await ringOf();
    const sealed = await sealAttachmentContent({ ring, binding: binding(), content });
    // 12-byte IV + 16-byte GCM tag; the old double-base64 path paid ~1.78×.
    expect(sealed.byteLength).toBe(content.byteLength + 28);
  });

  it.each([
    ['scope', { accessScopeId: 'scope-2' }],
    ['entity', { entityId: 'att-2' }],
    ['table', { entityTable: 'revisions' }],
    ['key id', { keyId: 'key-2' }],
    ['epoch', { epoch: 2 }],
  ])('refuses content under a binding whose %s differs', async (_what, override) => {
    const ring = await ringOf();
    const sealed = await sealAttachmentContent({ ring, binding: binding(), content });
    await expect(
      openAttachmentContent({ ring, binding: binding(override), sealed }),
    ).rejects.toBeInstanceOf(AttachmentContentIntegrityError);
  });

  it('refuses tampered ciphertext', async () => {
    const ring = await ringOf();
    const sealed = await sealAttachmentContent({ ring, binding: binding(), content });
    sealed[20] = sealed[20] ^ 0xff;
    await expect(
      openAttachmentContent({ ring, binding: binding(), sealed }),
    ).rejects.toBeInstanceOf(AttachmentContentIntegrityError);
  });

  it('seals the same content differently each time', async () => {
    const ring = await ringOf();
    const first = await sealAttachmentContent({ ring, binding: binding(), content });
    const second = await sealAttachmentContent({ ring, binding: binding(), content });
    expect(first).not.toEqual(second);
  });
});
