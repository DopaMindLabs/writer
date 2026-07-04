import { describe, it, expect } from 'vitest';
import { generateMasterSecret, deriveKeyRing } from './keys';
import { CIPHER_FIELD, plaintextFieldsFor } from './tableRules';
import {
  sealRow,
  openRow,
  EnvelopeIntegrityError,
  type CipherEnvelope,
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
      name: 'Secret title',
      body: { root: { children: [] } },
    };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const opened = await openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed);
    expect(opened).toEqual(row);
  });

  it('keeps index/pk fields plaintext and hides content fields', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, name: 'T', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    // Plaintext fields survive verbatim; content fields do not appear at all.
    expect(sealed.id).toBe('doc-1');
    expect(sealed.spaceId).toBe('s');
    expect(sealed.updatedAt).toBe(1);
    expect(sealed.name).toBeUndefined();
    expect(sealed.body).toBeUndefined();
    // The envelope carries only opaque bytes.
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelope;
    expect(envelope.v).toBe(1);
    expect(envelope.epoch).toBe(1);
    expect(envelope.iv).toHaveLength(12);
    const flat = JSON.stringify(Array.from(envelope.data));
    expect(flat).not.toContain('Secret');
    expect(JSON.stringify(sealed)).not.toContain('"B"');
  });

  it('passes through a row that carries no cipher envelope', async () => {
    const keyRing = await ring();
    const plain = { id: 'doc-1', spaceId: 's', name: 'nope' };
    expect(await openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, plain)).toEqual(plain);
  });

  it('rejects a row re-bound to a different primary key (AAD mismatch)', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-2' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a row re-bound to a different table (AAD mismatch)', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    await expect(openRow(keyRing, { table: 'notes', primaryKey: 'doc-1' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('rejects a tampered ciphertext', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules);
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelope;
    envelope.data[0] ^= 0xff;
    await expect(openRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, sealed)).rejects.toBeInstanceOf(
      EnvelopeIntegrityError,
    );
  });

  it('uses a fresh iv for every seal of the same row', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, body: 'B' };
    const a = (await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules))[CIPHER_FIELD] as CipherEnvelope;
    const b = (await sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules))[CIPHER_FIELD] as CipherEnvelope;
    expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data));
  });

  it('round-trips binary field values (Uint8Array and Blob)', async () => {
    const keyRing = await ring();
    const attachmentRules = plaintextFieldsFor('noteAttachments');
    const bytes = new Uint8Array([1, 2, 3, 250, 251]);
    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' });
    const row = { id: 'att-1', noteId: 'n-1', raw: bytes, file: blob };
    const sealed = await sealRow(keyRing, { table: 'noteAttachments', primaryKey: 'att-1' }, row, attachmentRules);
    const opened = await openRow(keyRing, { table: 'noteAttachments', primaryKey: 'att-1' }, sealed);
    expect(Array.from(opened.raw as Uint8Array)).toEqual([1, 2, 3, 250, 251]);
    const outBlob = opened.file as Blob;
    expect(outBlob.type).toBe('image/png');
    expect(Array.from(new Uint8Array(await outBlob.arrayBuffer()))).toEqual([9, 8, 7]);
  });

  it('refuses to encrypt a function value', async () => {
    const keyRing = await ring();
    const row = { id: 'doc-1', spaceId: 's', sectionId: 'x', updatedAt: 1, body: () => 0 };
    await expect(sealRow(keyRing, { table: 'docs', primaryKey: 'doc-1' }, row, rules)).rejects.toThrow();
  });
});
