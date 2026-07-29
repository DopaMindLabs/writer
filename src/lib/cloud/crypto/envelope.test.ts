import { describe, it, expect } from 'vitest';
import { generateMasterSecret, deriveKeyRing } from './keys';
import { CIPHER_FIELD, plaintextFieldsFor } from './tableRules';
import {
  sealRow,
  openRow,
  keyIdOf,
  EnvelopeIntegrityError,
  MalformedEnvelopeError,
  type CipherEnvelopeV2,
} from './envelope';

const ring = async () => deriveKeyRing(generateMasterSecret(), 1);
const rules = plaintextFieldsFor('docs');

describe('cipher envelope', () => {
  it('seals then opens back to the original row', async () => {
    const keyRing = await ring();
    const row = {
      id: 'doc-1',
      spaceId: 'space-1',
      sectionId: 'sec-1',
      updatedAt: 42,
      accessScopeId: 'space-1',
      name: 'Secret title',
      body: { root: { children: [] } },
    };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const opened = await openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed);
    expect(opened).toEqual(row);
  });

  it('encodes a 5 MiB binary body below twice its raw size and round-trips it', async () => {
    const keyRing = await ring();
    const raw = new Uint8Array(5 * 1024 * 1024);
    for (let i = 0; i < raw.length; i += 1) raw[i] = i % 256;
    const blob = new Blob([raw], { type: 'application/octet-stream' });
    const row = { id: 'att-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: blob };

    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'att-1' }, row, rules);
    // Base64 ciphertext, not a ~4× number-array expansion of the raw bytes.
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;
    expect(envelope.data.length).toBeLessThan(raw.length * 2);

    const opened = await openRow(keyRing, { table: 'docs', primaryKey: 'att-1' }, sealed);
    const out = opened.body as Blob;
    expect(out.type).toBe('application/octet-stream');
    expect(new Uint8Array(await out.arrayBuffer()).length).toBe(raw.length);
  });

  it('keeps index/pk fields plaintext and hides content fields', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'T', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    // Plaintext fields survive verbatim; content fields do not appear at all.
    expect(sealed.id).toBe('doc-1');
    expect(sealed.spaceId).toBe('s');
    expect(sealed.updatedAt).toBe(1);
    expect(sealed.accessScopeId).toBe('s');
    expect(sealed.name).toBeUndefined();
    expect(sealed.body).toBeUndefined();
    // The envelope carries only opaque base64 ciphertext — never a Uint8Array
    // (which Dexie Cloud would offload to a blob) and never leaked plaintext.
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;
    expect(envelope.v).toBe(2);
    expect(envelope.epoch).toBe(1);
    expect(envelope.keyId).toBe(keyIdOf(keyRing));
    expect(envelope.accessScopeId).toBe('s');
    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(typeof envelope.iv).toBe('string');
    expect(typeof envelope.data).toBe('string');
    expect(atob(envelope.iv)).toHaveLength(12);
    // Plaintext never survives in the sealed row (neither the field value nor
    // its key). Decoded ciphertext is random bytes, so assert on the row itself.
    expect(JSON.stringify(sealed)).not.toContain('"B"');
    expect(JSON.stringify(sealed)).not.toContain('"name"');
  });

  it('keeps realmId plaintext on a realm-stamped row, sealing the content around it', async () => {
    const keyRing = await ring();
    // A doc moved into a shared realm: the server must be able to read realmId
    // to enforce access control, while the writing stays sealed.
    const row = {
      id: 'doc-1',
      spaceId: 's',
      sectionId: 'x',
      updatedAt: 1,
      accessScopeId: 's',
      realmId: 'rlm-shared',
      name: 'Chapter One',
      body: 'the writing',
    };

    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);

    expect(sealed.realmId).toBe('rlm-shared');
    expect(sealed.name).toBeUndefined();
    expect(JSON.stringify(sealed)).not.toContain('the writing');

    const opened = await openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed);
    expect(opened).toEqual(row);
  });

  it('refuses to seal a synced row that carries no access scope', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'T', body: 'B' };
    await expect(
      sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules),
    ).rejects.toBeInstanceOf(MalformedEnvelopeError);
  });

  it('passes through a row that carries no cipher envelope', async () => {
    const keyRing = await ring();
    const plain = { id: 'doc-1', spaceId: 's', name: 'nope' };
    expect(await openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, plain)).toEqual(plain);
  });

  it('rejects a row re-bound to a different primary key (AAD mismatch)', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-2' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a row re-bound to a different table (AAD mismatch)', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    await expect(openRow(keyRing, { table: 'notes', primaryKey: 'doc-1' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a row whose access scope was swapped without re-encryption', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 'space-a', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    // A sync layer restamps the plaintext scope without decrypting. The sealed
    // scope no longer matches the row context, so authentication must fail —
    // preserving an old envelope across a scope change is invalid by design.
    const swapped = { ...sealed, accessScopeId: 'space-b' };
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, swapped)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a tampered key id or epoch (AAD mismatch)', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;

    const wrongEpoch = { ...sealed, [CIPHER_FIELD]: { ...envelope, epoch: 2 } };
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, wrongEpoch)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );

    const wrongKeyId = { ...sealed, [CIPHER_FIELD]: { ...envelope, keyId: 'AAAA' } };
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, wrongKeyId)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a tampered ciphertext', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;
    // Flip a ciphertext byte, keeping it valid base64 so the failure is an
    // authentication (integrity) failure, not a malformed-shape rejection.
    const bytes = Uint8Array.from(atob(envelope.data), (c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    envelope.data = btoa(String.fromCharCode(...bytes));
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('uses a fresh iv for every seal of the same row', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const a = (await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules))[CIPHER_FIELD] as CipherEnvelopeV2;
    const b = (await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules))[CIPHER_FIELD] as CipherEnvelopeV2;
    expect(a.iv).not.toEqual(b.iv);
    expect(a.data).not.toEqual(b.data);
  });

  it('round-trips binary field values (Uint8Array and Blob)', async () => {
    const keyRing = await ring();
    const attachmentRules = plaintextFieldsFor('noteAttachments');
    const bytes = new Uint8Array([1, 2, 3, 250, 251]);
    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' });
    const row = { id: 'att-1', noteId: 'n-1', accessScopeId: 's', raw: bytes, file: blob };
    const sealed = await sealRow(keyRing, { table: 'noteAttachments', primaryKey: 'att-1' }, row, attachmentRules);
    const opened = await openRow(keyRing, { table: 'noteAttachments', primaryKey: 'att-1' }, sealed);
    expect(Array.from(opened.raw as Uint8Array)).toEqual([1, 2, 3, 250, 251]);
    const outBlob = opened.file as Blob;
    expect(outBlob.type).toBe('image/png');
    expect(Array.from(new Uint8Array(await outBlob.arrayBuffer()))).toEqual([9, 8, 7]);
  });

  it('rejects a non-string data field as malformed, not an integrity failure', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;
    // Simulate a stray non-string shape reaching the decrypt path (e.g. a Dexie
    // Cloud blob ref). It must be a malformed-envelope error — never an integrity
    // error, which would wrongly engage the key-mismatch lock on the device.
    (envelope as unknown as { data: unknown }).data = {
      _bt: 'Uint8Array',
      ref: '2:abc',
      size: 5015,
    };
    const opening = openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed);
    await expect(opening).rejects.toBeInstanceOf(MalformedEnvelopeError);
    await expect(opening).rejects.not.toBeInstanceOf(EnvelopeIntegrityError);
  });

  it('rejects a legacy v1 envelope as malformed — there is no dual-read', async () => {
    const keyRing = await ring();
    const row = {
      id: 'doc-1',
      accessScopeId: 's',
      [CIPHER_FIELD]: { v: 1, epoch: 1, iv: 'AAAA', data: 'AAAA' },
    };
    await expect(
      openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row),
    ).rejects.toBeInstanceOf(MalformedEnvelopeError);
  });

  it('refuses to encrypt a function value', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', body: () => 0 };
    await expect(sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules)).rejects.toThrow();
  });
});
