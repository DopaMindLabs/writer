import { describe, it, expect, vi } from 'vitest';
import { broadcastDocReload, onDocReload } from './docReloadChannel';

const settle = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 30));

describe('docReloadChannel', () => {
  it('notifies a subscriber when its doc id is reloaded', async () => {
    const onReload = vi.fn();
    const off = onDocReload('d1', onReload);
    broadcastDocReload(['d1', 'd2']);
    await settle();
    expect(onReload).toHaveBeenCalledTimes(1);
    off();
  });

  it('ignores reloads for other docs', async () => {
    const onReload = vi.fn();
    const off = onDocReload('d1', onReload);
    broadcastDocReload(['d2', 'd3']);
    await settle();
    expect(onReload).not.toHaveBeenCalled();
    off();
  });

  it('stops notifying after unsubscribe', async () => {
    const onReload = vi.fn();
    const off = onDocReload('d1', onReload);
    off();
    broadcastDocReload(['d1']);
    await settle();
    expect(onReload).not.toHaveBeenCalled();
  });

  it('broadcasts nothing for an empty doc list', async () => {
    const onReload = vi.fn();
    const off = onDocReload('d1', onReload);
    broadcastDocReload([]);
    await settle();
    expect(onReload).not.toHaveBeenCalled();
    off();
  });
});
