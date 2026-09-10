import { describe, expect, it } from 'vitest';
import { runUnderSyncApplyLock } from './syncApplyLock';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('runUnderSyncApplyLock', () => {
  it('runs tasks one at a time, in submission order', async () => {
    const order: string[] = [];
    let releaseFirst = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = runUnderSyncApplyLock(async () => {
      order.push('first:start');
      await gate;
      order.push('first:end');
    });
    const second = runUnderSyncApplyLock(async () => {
      order.push('second:start');
    });

    await tick();
    expect(order).toEqual(['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second:start']);
  });

  it('returns the task result', async () => {
    await expect(runUnderSyncApplyLock(() => Promise.resolve(7))).resolves.toBe(7);
  });

  it('releases the lock when a task rejects, without poisoning the queue', async () => {
    await expect(
      runUnderSyncApplyLock(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(runUnderSyncApplyLock(() => Promise.resolve('after'))).resolves.toBe(
      'after',
    );
  });
});
