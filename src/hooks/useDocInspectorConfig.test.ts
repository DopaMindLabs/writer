import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { db } from '@/db/db';
import { setGlobalToggle, setSpaceToggle } from '@/lib/docInspector/config';
import {
  useEffectiveInspectorConfig,
  useGlobalInspectorConfig,
} from './useDocInspectorConfig';

afterEach(async () => {
  await db.docInspectorConfigs.clear();
});

describe('useGlobalInspectorConfig', () => {
  it('defaults to all-on before any row is written', async () => {
    const { result } = renderHook(() => useGlobalInspectorConfig());
    await waitFor(() => {
      expect(result.current.status).toBe('on');
    });
    expect(result.current.highlightOverLimit).toBe('on');
  });

  it('reflects a written global toggle', async () => {
    await setGlobalToggle('dueDate', false);
    const { result } = renderHook(() => useGlobalInspectorConfig());
    await waitFor(() => {
      expect(result.current.dueDate).toBe('off');
    });
  });
});

describe('useEffectiveInspectorConfig', () => {
  it('resolves the global default when the space inherits', async () => {
    await setGlobalToggle('wordLimit', false);
    const { result } = renderHook(() => useEffectiveInspectorConfig('s1'));
    await waitFor(() => {
      expect(result.current.effective.wordLimit).toBe(false);
    });
    expect(result.current.effective.status).toBe(true);
  });

  it('lets a space override the global default back on', async () => {
    await setGlobalToggle('wordLimit', false);
    await setSpaceToggle('s1', 'wordLimit', 'on');
    const { result } = renderHook(() => useEffectiveInspectorConfig('s1'));
    await waitFor(() => {
      expect(result.current.effective.wordLimit).toBe(true);
    });
  });
});
