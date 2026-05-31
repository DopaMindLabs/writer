import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCompleted,
  isCompleted,
  markCompleted,
  resetTour,
  resetAll,
  TOURS_STORAGE_KEY,
} from './storage';

describe('tours/storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns an empty list when nothing has been persisted yet', () => {
    expect(getCompleted()).toEqual([]);
    expect(isCompleted('welcome')).toBe(false);
  });

  it('markCompleted persists the tour id to the lipsum-tours entry', () => {
    markCompleted('welcome');
    expect(getCompleted()).toEqual(['welcome']);
    expect(isCompleted('welcome')).toBe(true);

    const raw = window.localStorage.getItem(TOURS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.completed).toEqual(['welcome']);
    expect(parsed.version).toBe(1);
  });

  it('markCompleted is idempotent', () => {
    markCompleted('welcome');
    markCompleted('welcome');
    expect(getCompleted()).toEqual(['welcome']);
  });

  it('preserves earlier entries when marking a second tour', () => {
    markCompleted('welcome');
    markCompleted('writer');
    expect(getCompleted()).toEqual(['welcome', 'writer']);
  });

  it('resetTour removes a single id without affecting others', () => {
    markCompleted('welcome');
    markCompleted('writer');
    resetTour('welcome');
    expect(getCompleted()).toEqual(['writer']);
    expect(isCompleted('welcome')).toBe(false);
    expect(isCompleted('writer')).toBe(true);
  });

  it('resetAll clears every completion', () => {
    markCompleted('welcome');
    markCompleted('writer');
    markCompleted('citations');
    resetAll();
    expect(getCompleted()).toEqual([]);
  });

  it('treats malformed JSON in storage as no completions', () => {
    window.localStorage.setItem(TOURS_STORAGE_KEY, '{not json');
    expect(getCompleted()).toEqual([]);
  });

  it('ignores non-string entries in a tampered completed array', () => {
    window.localStorage.setItem(
      TOURS_STORAGE_KEY,
      JSON.stringify({ version: 1, completed: ['welcome', 42, null, 'writer'] }),
    );
    expect(getCompleted()).toEqual(['welcome', 'writer']);
  });
});
