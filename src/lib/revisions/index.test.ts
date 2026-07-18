import { describe, expect, it } from 'vitest';
import * as revisions from './index';

describe('src/lib/revisions barrel', () => {
  it('re-exports the create/capture/restore helpers, the diff helpers and the throttle constants', () => {
    expect(typeof revisions.createRevision).toBe('function');
    expect(typeof revisions.captureAutoRevision).toBe('function');
    expect(typeof revisions.captureBaselineRevision).toBe('function');
    expect(typeof revisions.resetAutoThrottle).toBe('function');
    expect(typeof revisions.restoreRevision).toBe('function');
    expect(typeof revisions.computeInlineDiff).toBe('function');
    expect(typeof revisions.computeSideBySideDiff).toBe('function');
    expect(typeof revisions.MAX_AUTO_REVISIONS_PER_DOC).toBe('number');
    expect(typeof revisions.AUTO_REVISION_MIN_INTERVAL_MS).toBe('number');
  });
});
