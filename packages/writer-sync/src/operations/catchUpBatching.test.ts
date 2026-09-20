import { describe, expect, it } from 'vitest';
import type { EncryptedSyncFrame } from './operation.types';
import { encodeCatchUpMessage, CATCH_UP_PROTOCOL_VERSION } from './catchUpMessage';
import { fitsMessageBudget, packFrames } from './catchUpBatching';

const frame = (id: string, payload = ''): EncryptedSyncFrame =>
  ({
    operationId: id,
    accessScopeId: 'scope-1',
    deviceId: 'device-1',
    entityTable: 'docs',
    entityId: `entity-${id}`,
    kind: 'put',
    logicalTime: { millis: 1000, counter: 0 },
    keyId: 'k1',
    epoch: 1,
    iv: 'aXY',
    payload,
    payloadHash: 'aGFzaA',
    signature: 'c2ln',
  }) as unknown as EncryptedSyncFrame;

/** The bytes one batch actually occupies on the wire, worst-case flag. */
const encodedBytes = (frames: EncryptedSyncFrame[]): number =>
  encodeCatchUpMessage({
    v: CATCH_UP_PROTOCOL_VERSION,
    kind: 'frames',
    frames,
    final: false,
  }).byteLength;

describe('packFrames', () => {
  it('keeps everything in one batch when it fits', () => {
    const frames = [frame('a'), frame('b'), frame('c')];
    const { batches, oversized } = packFrames({ frames, maxFrames: 64, maxBytes: 100_000 });
    expect(batches).toEqual([frames]);
    expect(oversized).toEqual([]);
  });

  it('never exceeds the frame-count ceiling', () => {
    const frames = Array.from({ length: 10 }, (_, index) => frame(`f${String(index)}`));
    const { batches } = packFrames({ frames, maxFrames: 4 });
    expect(batches.map((batch) => batch.length)).toEqual([4, 4, 2]);
  });

  it('splits by encoded size so every batch fits the byte budget', () => {
    const frames = Array.from({ length: 12 }, (_, index) =>
      frame(`f${String(index)}`, 'p'.repeat(400)),
    );
    const maxBytes = 2_000;
    const { batches, oversized } = packFrames({ frames, maxFrames: 64, maxBytes });
    expect(oversized).toEqual([]);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(batch.length).toBeGreaterThan(0);
      expect(encodedBytes(batch)).toBeLessThanOrEqual(maxBytes);
    }
    expect(batches.flat()).toEqual(frames);
  });

  it('isolates a frame that cannot fit any message on its own', () => {
    const big = frame('big', 'p'.repeat(5_000));
    const frames = [frame('a'), big, frame('b')];
    const { batches, oversized } = packFrames({ frames, maxFrames: 64, maxBytes: 2_000 });
    expect(oversized).toEqual([big]);
    expect(batches.flat()).toEqual([frame('a'), frame('b')]);
  });

  it('keeps the input order across batches', () => {
    const frames = Array.from({ length: 9 }, (_, index) =>
      frame(`f${String(index)}`, 'p'.repeat(300)),
    );
    const { batches } = packFrames({ frames, maxFrames: 64, maxBytes: 1_500 });
    expect(batches.flat().map((packed) => (packed as { operationId: string }).operationId)).toEqual(
      frames.map((original) => (original as { operationId: string }).operationId),
    );
  });

  it('answers an empty reply with one empty batch, so a final message still goes out', () => {
    const { batches, oversized } = packFrames({ frames: [], maxFrames: 64, maxBytes: 2_000 });
    expect(batches).toEqual([[]]);
    expect(oversized).toEqual([]);
  });

  it('packs by count alone when no byte budget is given', () => {
    const frames = Array.from({ length: 5 }, (_, index) =>
      frame(`f${String(index)}`, 'p'.repeat(100_000)),
    );
    const { batches, oversized } = packFrames({ frames, maxFrames: 2 });
    expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
    expect(oversized).toEqual([]);
  });
});

describe('fitsMessageBudget', () => {
  it('accepts anything when the transport states no ceiling', () => {
    expect(fitsMessageBudget(10_000_000, undefined)).toBe(true);
  });

  it('compares against the stated ceiling inclusively', () => {
    expect(fitsMessageBudget(100, 100)).toBe(true);
    expect(fitsMessageBudget(101, 100)).toBe(false);
  });
});
