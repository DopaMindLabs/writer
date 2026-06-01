import { describe, it, expect } from 'vitest';
import type { Doc } from '@/db/schema';
import { docHasValue, showField } from './showField';

const doc = (over: Partial<Doc['meta']>): Doc => ({
  id: 'd',
  spaceId: 's',
  sectionId: 'sec',
  name: 'D',
  body: '',
  updatedAt: 0,
  meta: { wordCount: 0, ...over },
});

describe('docHasValue', () => {
  it('detects a word limit only when positive', () => {
    expect(docHasValue('wordLimit', doc({}))).toBe(false);
    expect(docHasValue('wordLimit', doc({ wordLimit: 0 }))).toBe(false);
    expect(docHasValue('wordLimit', doc({ wordLimit: 500 }))).toBe(true);
  });

  it('detects a character limit only when positive', () => {
    expect(docHasValue('charLimit', doc({}))).toBe(false);
    expect(docHasValue('charLimit', doc({ charLimit: 2000 }))).toBe(true);
  });

  it('detects a non-draft status', () => {
    expect(docHasValue('status', doc({}))).toBe(false);
    expect(docHasValue('status', doc({ status: 'draft' }))).toBe(false);
    expect(docHasValue('status', doc({ status: 'Draft' }))).toBe(false); // legacy
    expect(docHasValue('status', doc({ status: 'complete' }))).toBe(true);
  });

  it('detects a due date', () => {
    expect(docHasValue('dueDate', doc({}))).toBe(false);
    expect(docHasValue('dueDate', doc({ dueDate: 1_700_000_000_000 }))).toBe(
      true,
    );
  });
});

describe('showField', () => {
  it('shows when the feature is enabled', () => {
    expect(showField('dueDate', true, doc({}))).toBe(true);
  });

  it('shows a disabled feature when the doc already has a value', () => {
    expect(showField('dueDate', false, doc({ dueDate: 1 }))).toBe(true);
  });

  it('hides a disabled feature with no value', () => {
    expect(showField('dueDate', false, doc({}))).toBe(false);
  });
});
