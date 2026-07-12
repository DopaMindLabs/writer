import { describe, expect, it } from 'vitest';
import * as docs from './index';

describe('src/lib/docs barrel', () => {
  it('re-exports the repository facade, the empty body and the cascade helper', () => {
    expect(typeof docs.createDoc).toBe('function');
    expect(typeof docs.createDocs).toBe('function');
    expect(typeof docs.renameDoc).toBe('function');
    expect(typeof docs.restoreDocs).toBe('function');
    expect(typeof docs.seedDocCrdt).toBe('function');
    expect(typeof docs.seedDocsCrdt).toBe('function');
    expect(typeof docs.setDocStatus).toBe('function');
    expect(typeof docs.updateDocBody).toBe('function');
    expect(typeof docs.updateDocMeta).toBe('function');
    expect(typeof docs.deleteDocCascade).toBe('function');
    expect(typeof docs.EMPTY_LEXICAL_JSON).toBe('string');
  });
});
