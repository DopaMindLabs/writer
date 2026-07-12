import { describe, it, expect, vi } from 'vitest';
import { broadcastKeyRingChange, startKeyRingChannel } from './keyRingChannel';

const CHANNEL = 'lipsum-cloud-keyring';
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30));

/** Post a raw message as if from a different tab (a different source id). */
const postForeign = (op: 'changed' | 'forgotten'): void => {
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ source: 'other-tab', op });
  channel.close();
};

describe('keyRingChannel', () => {
  it('reloads the ring when another tab changes it', async () => {
    const onForeign = vi.fn();
    const stop = startKeyRingChannel(onForeign);
    postForeign('changed');
    await settle();
    expect(onForeign).toHaveBeenCalledTimes(1);
    stop();
  });

  it('reloads (to lock) when another tab forgets the ring', async () => {
    const onForeign = vi.fn();
    const stop = startKeyRingChannel(onForeign);
    postForeign('forgotten');
    await settle();
    expect(onForeign).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ignores its own broadcast so a tab never reloads on its own save', async () => {
    const onForeign = vi.fn();
    const stop = startKeyRingChannel(onForeign);
    broadcastKeyRingChange('changed'); // same module source id → own echo
    await settle();
    expect(onForeign).not.toHaveBeenCalled();
    stop();
  });

  it('ignores malformed messages', async () => {
    const onForeign = vi.fn();
    const stop = startKeyRingChannel(onForeign);
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ not: 'a keyring message' });
    channel.close();
    await settle();
    expect(onForeign).not.toHaveBeenCalled();
    stop();
  });

  it('stops reloading after cleanup closes the channel', async () => {
    const onForeign = vi.fn();
    const stop = startKeyRingChannel(onForeign);
    stop();
    postForeign('changed');
    await settle();
    expect(onForeign).not.toHaveBeenCalled();
  });
});
