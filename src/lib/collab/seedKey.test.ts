import { describe, it, expect } from 'vitest';
import { collabSeedKey } from './seedKey';

describe('collabSeedKey', () => {
  it('namespaces the doc id under the collab-seed prefix', () => {
    expect(collabSeedKey('doc-1')).toBe('collab-seed:doc-1');
  });

  it('is distinct per doc id', () => {
    expect(collabSeedKey('a')).not.toBe(collabSeedKey('b'));
  });
});
