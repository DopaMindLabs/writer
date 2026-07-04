import { describe, it, expect } from 'vitest';
import { InvariantError } from '@/lib/invariant';
import { generateMasterSecret } from './keys';
import { encodeRecoveryCode, decodeRecoveryCode } from './recoveryCode';

describe('recovery code', () => {
  it('round-trips a master secret', () => {
    const master = generateMasterSecret();
    const decoded = decodeRecoveryCode(encodeRecoveryCode(master));
    expect(Array.from(decoded)).toEqual(Array.from(master));
  });

  it('groups the code into 8-character blocks', () => {
    const code = encodeRecoveryCode(generateMasterSecret());
    for (const block of code.split('-')) {
      expect(block.length).toBeLessThanOrEqual(8);
    }
    expect(code).toMatch(/^[0-9A-Z-]+$/);
  });

  it('tolerates lowercase, spaces and hyphens', () => {
    const master = generateMasterSecret();
    const code = encodeRecoveryCode(master);
    const messy = code.toLowerCase().replace(/-/g, ' ');
    expect(Array.from(decodeRecoveryCode(messy))).toEqual(Array.from(master));
  });

  it('rejects a corrupted checksum', () => {
    const code = encodeRecoveryCode(generateMasterSecret());
    // Flip the first character to corrupt the payload.
    const first = code.startsWith('0') ? '1' : '0';
    const corrupted = first + code.slice(1);
    expect(() => decodeRecoveryCode(corrupted)).toThrow(InvariantError);
  });

  it('rejects an invalid character', () => {
    expect(() => decodeRecoveryCode('!!!!')).toThrow(InvariantError);
  });
});
