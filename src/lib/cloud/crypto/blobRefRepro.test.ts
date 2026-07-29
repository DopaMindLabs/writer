import { describe, it, expect } from 'vitest';
import { generateRootSecret, deriveKeyRing } from './keys';
import { plaintextFieldsFor, CIPHER_FIELD } from './tableRules';
import {
  sealRow,
  openRow,
  EnvelopeIntegrityError,
  MalformedEnvelopeError,
  type CipherEnvelopeV2,
} from './envelope';

/**
 * Regression guard for the cross-device "doc erased" defect.
 *
 * Dexie Cloud offloads any binary value (`Uint8Array`) ≥ 4 KB to blob storage,
 * shipping a `{_bt,ref,size}` ref the receiver resolves asynchronously. The old
 * envelope stored ciphertext as a `Uint8Array`, so large doc bodies were
 * offloaded; a pulled-but-unresolved ref then reached the decrypt path and was
 * mis-reported as an integrity failure, dropping the doc and falsely locking the
 * device — while the addon's blob save-back looped forever.
 *
 * The fix seals ciphertext into an inline base64 **string**, which Dexie Cloud
 * never offloads (paired with `largeStringThreshold: Infinity`). These tests
 * pin both halves: the envelope is offload-safe, and if a stray blob-ref shape
 * ever reaches decrypt it is a malformed-envelope error, not an integrity one.
 */
describe('blob-offload safety of the cipher envelope', () => {
  const rules = plaintextFieldsFor('docs');
  const ring = () => deriveKeyRing(generateRootSecret(), 1);

  it('seals a large doc body into inline strings, never an offloadable Uint8Array', async () => {
    const keyRing = await ring();
    const row = {
      id: 'k3xO7DLDD8Fs3HZD',
      spaceId: 'QiGrk52tJmU33GRC',
      sectionId: '1rlOluPbW8HkY97B',
      updatedAt: 1783865117923,
      accessScopeId: 'QiGrk52tJmU33GRC',
      name: 'Methods',
      // ~5 KB body — comfortably past the 4096-byte binary offload threshold.
      body: 'Lorem ipsum dolor sit amet. '.repeat(180),
    };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: row.id }, row, rules);
    const envelope = sealed[CIPHER_FIELD] as CipherEnvelopeV2;

    // The offload predicate only fires on binary values; strings are inert.
    expect(typeof envelope.iv).toBe('string');
    expect(typeof envelope.data).toBe('string');
    expect(envelope.data.length).toBeGreaterThan(4096);
    // No field anywhere on the row is a Uint8Array (the only offload trigger).
    for (const value of Object.values(envelope)) {
      expect(value).not.toBeInstanceOf(Uint8Array);
    }
    // And it still round-trips.
    const opened = await openRow(keyRing, { table: 'docs', primaryKey: row.id }, sealed);
    expect(opened).toEqual(row);
  });

  it('treats a stray blob-ref shape as malformed, never a key mismatch', async () => {
    const keyRing = await ring();
    const row = { id: 'd1', spaceId: 's', sectionId: 'x', updatedAt: 1, accessScopeId: 's', name: 'T', body: 'B' };
    const sealed = await sealRow(keyRing, { table: 'docs', primaryKey: 'd1' }, row, rules);
    // The exact unresolved-ref shape from the field report's /sync payload.
    (sealed[CIPHER_FIELD] as unknown as { data: unknown }).data = {
      _bt: 'Uint8Array',
      ref: '2:0PyMeQSmG7Fo17KQiosw1kY_',
      size: 5015,
    };
    const opening = openRow(keyRing, { table: 'docs', primaryKey: 'd1' }, sealed);
    await expect(opening).rejects.toBeInstanceOf(MalformedEnvelopeError);
    await expect(opening).rejects.not.toBeInstanceOf(EnvelopeIntegrityError);
  });
});
