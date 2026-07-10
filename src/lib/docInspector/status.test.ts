import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATUS,
  DOC_STATUS_STAGES,
  isDocStatus,
  isLockedStatus,
  resolveStatus,
} from './status';

describe('DOC_STATUS_STAGES', () => {
  it('declares the five stages in workflow order', () => {
    expect(DOC_STATUS_STAGES.map((s) => s.id)).toEqual([
      'draft',
      'in-progress',
      'in-review',
      'complete',
      'published',
    ]);
    const orders = DOC_STATUS_STAGES.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('enables every stage by default', () => {
    expect(DOC_STATUS_STAGES.every((s) => s.enabledByDefault)).toBe(true);
  });

  it('locks only complete and published', () => {
    const locking = DOC_STATUS_STAGES.filter((s) => s.locks).map((s) => s.id);
    expect(locking).toEqual(['complete', 'published']);
  });
});

describe('isDocStatus', () => {
  it('accepts known stage ids', () => {
    expect(isDocStatus('draft')).toBe(true);
    expect(isDocStatus('published')).toBe(true);
  });

  it('rejects unknown or non-string values', () => {
    expect(isDocStatus('Draft')).toBe(false);
    expect(isDocStatus('done')).toBe(false);
    expect(isDocStatus(undefined)).toBe(false);
    expect(isDocStatus(3)).toBe(false);
  });
});

describe('resolveStatus', () => {
  it('returns the default for undefined or legacy values', () => {
    expect(resolveStatus(undefined)).toBe(DEFAULT_STATUS);
    expect(resolveStatus('Draft')).toBe('draft');
    expect(resolveStatus('whatever')).toBe('draft');
  });

  it('passes through known stages unchanged', () => {
    expect(resolveStatus('in-review')).toBe('in-review');
    expect(resolveStatus('complete')).toBe('complete');
  });
});

describe('isLockedStatus', () => {
  it('treats draft and intermediate stages as editable', () => {
    expect(isLockedStatus(undefined)).toBe(false);
    expect(isLockedStatus('draft')).toBe(false);
    expect(isLockedStatus('in-progress')).toBe(false);
    expect(isLockedStatus('in-review')).toBe(false);
    expect(isLockedStatus('Draft')).toBe(false);
  });

  it('locks complete and published', () => {
    expect(isLockedStatus('complete')).toBe(true);
    expect(isLockedStatus('published')).toBe(true);
  });
});
