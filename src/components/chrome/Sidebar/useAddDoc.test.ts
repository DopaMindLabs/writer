import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import type { Doc, Space } from '@/db/schema';

const { navigateMock, createDocMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  createDocMock: vi.fn<typeof import('@/lib/docs').createDoc>(),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@/lib/docs', async (orig) => ({
  ...(await orig<typeof import('@/lib/docs')>()),
  createDoc: createDocMock,
}));

import { sampleMetadata } from '@/test/fixtures';
import { useAddDoc } from './useAddDoc';

const createdDoc: Doc = {
  ...sampleMetadata(),
  id: 'new-doc',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Created',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

const journalSpace: Space = {
  ...sampleMetadata(),
  id: 's1',
  tag: 'JRN',
  name: 'Journal',
  shared: false,
  template: 'journal',
  createdAt: 0,
  updatedAt: 0,
};

const keyEvent = (key: string): KeyboardEvent<HTMLInputElement> =>
  ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLInputElement>;

describe('useAddDoc', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    createDocMock.mockReset().mockResolvedValue(createdDoc);
  });

  it('is idle before an add is started', () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    expect(result.current.add.adding).toBeNull();
  });

  it('seeds the default name from the template section when starting an add', () => {
    const { result } = renderHook(() => useAddDoc('s1', journalSpace));
    act(() => {
      result.current.startAdd('sec1', 'Themes', null);
    });
    expect(result.current.add.adding).toEqual({
      sectionId: 'sec1',
      value: 'Theme',
    });
  });

  it('falls back to Untitled when the space has no template match', () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    expect(result.current.add.adding?.value).toBe('Untitled');
  });

  it('tracks edits to the pending name', () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onChange('My chapter');
    });
    expect(result.current.add.adding?.value).toBe('My chapter');
  });

  it('creates the document and navigates to it on Enter', async () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onChange('My chapter');
    });
    await act(async () => {
      result.current.add.onKeyDown(keyEvent('Enter'));
    });
    expect(createDocMock).toHaveBeenCalledWith({
      spaceId: 's1',
      sectionId: 'sec1',
      name: 'My chapter',
    });
    expect(navigateMock).toHaveBeenCalledWith('/s/s1/d/new-doc');
    expect(result.current.add.adding).toBeNull();
  });

  it('creates the document with the untitled fallback when committed blank', async () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onChange('   ');
    });
    await act(async () => {
      result.current.add.onKeyDown(keyEvent('Enter'));
    });
    expect(createDocMock).toHaveBeenCalledWith({
      spaceId: 's1',
      sectionId: 'sec1',
      name: 'Untitled',
    });
  });

  it('cancels the add on Escape without creating a document', () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onKeyDown(keyEvent('Escape'));
    });
    expect(result.current.add.adding).toBeNull();
    expect(createDocMock).not.toHaveBeenCalled();
  });

  it('persists on blur with a name but does not navigate away', async () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onChange('Saved on blur');
    });
    await act(async () => {
      result.current.add.onBlur();
    });
    expect(createDocMock).toHaveBeenCalledWith({
      spaceId: 's1',
      sectionId: 'sec1',
      name: 'Saved on blur',
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.add.adding).toBeNull();
  });

  it('discards a blank add on blur without persisting', async () => {
    const { result } = renderHook(() => useAddDoc('s1', undefined));
    act(() => {
      result.current.startAdd('sec1', 'Anything', null);
    });
    act(() => {
      result.current.add.onChange('   ');
    });
    await act(async () => {
      result.current.add.onBlur();
    });
    expect(createDocMock).not.toHaveBeenCalled();
    expect(result.current.add.adding).toBeNull();
  });
});
