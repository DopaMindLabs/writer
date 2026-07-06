import { describe, it, expect } from 'vitest';
import { generateContentKey, exportContentKey, importContentKey } from './contentKey';

describe('contentKey', () => {
  it('generates a 256-bit AES-GCM key for encrypt/decrypt', async () => {
    const key = await generateContentKey();
    expect(key.type).toBe('secret');
    const alg = key.algorithm as AesKeyAlgorithm;
    expect(alg.name).toBe('AES-GCM');
    expect(alg.length).toBe(256);
    expect([...key.usages].sort()).toEqual(['decrypt', 'encrypt']);
  });

  it('export → import round-trips the raw key material', async () => {
    const key = await generateContentKey();
    const raw = await exportContentKey(key);
    expect(raw.byteLength).toBe(32);
    const roundTripped = await exportContentKey(await importContentKey(raw));
    expect([...roundTripped]).toEqual([...raw]);
  });
});
