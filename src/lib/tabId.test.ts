import { describe, it, expect, beforeEach } from 'vitest';
import { getTabId } from './tabId';

describe('getTabId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('creates an id on first read and returns the same id thereafter', () => {
    const first = getTabId();
    expect(first).toBeTruthy();
    expect(getTabId()).toBe(first);
  });

  it('persists the id in sessionStorage', () => {
    const id = getTabId();
    expect(sessionStorage.getItem('lipsum-tab-id')).toBe(id);
  });
});
