import type { EncryptedSyncFrame } from './operation.types';
import { CATCH_UP_PROTOCOL_VERSION, encodeCatchUpMessage } from './catchUpMessage';

/**
 * Packing catch-up replies under two ceilings at once: the protocol's
 * frame-count bound (the decoder refuses more) and the transport's message
 * byte budget (the channel refuses more). Counting alone was how a reply
 * whose frames were individually modest still produced one message the
 * channel threw away — killing the exchange mid-reply, before its final
 * marker and so before any acknowledgement.
 *
 * Sizes are measured in encoded bytes, never string length: the payloads are
 * base64 but nothing else in a frame has to be ASCII.
 */

export interface PackedFrames {
  /**
   * Batches in input order, each within both ceilings. Never empty: an empty
   * input packs to one empty batch, because an empty reply still owes the
   * peer its final message.
   */
  batches: EncryptedSyncFrame[][];
  /** Frames that cannot fit a message even alone. The caller decides. */
  oversized: EncryptedSyncFrame[];
}

/** Whether one encoded message fits a transport's stated budget, if any. */
export const fitsMessageBudget = (byteLength: number, maxBytes?: number): boolean =>
  maxBytes === undefined || byteLength <= maxBytes;

/**
 * What the envelope costs before any frame is in it, measured with the longer
 * `final` flag so the budget holds for either value.
 */
const envelopeBytes = (): number =>
  encodeCatchUpMessage({
    v: CATCH_UP_PROTOCOL_VERSION,
    kind: 'frames',
    frames: [],
    final: false,
  }).byteLength;

/** One frame's cost inside the array: its own JSON plus a separator. */
const frameBytes = (frame: EncryptedSyncFrame): number =>
  new TextEncoder().encode(JSON.stringify(frame)).byteLength + 1;

export const packFrames = (options: {
  frames: readonly EncryptedSyncFrame[];
  maxFrames: number;
  maxBytes?: number;
}): PackedFrames => {
  const { frames, maxFrames, maxBytes } = options;
  const budget = maxBytes === undefined ? undefined : maxBytes - envelopeBytes();

  const batches: EncryptedSyncFrame[][] = [];
  const oversized: EncryptedSyncFrame[] = [];
  let current: EncryptedSyncFrame[] = [];
  let currentBytes = 0;

  const closeCurrent = (): void => {
    if (current.length > 0) batches.push(current);
    current = [];
    currentBytes = 0;
  };

  for (const frame of frames) {
    const cost = budget === undefined ? 0 : frameBytes(frame);
    if (budget !== undefined && cost > budget) {
      oversized.push(frame);
      continue;
    }
    const overCount = current.length >= maxFrames;
    const overBytes = budget !== undefined && currentBytes + cost > budget;
    if (overCount || overBytes) closeCurrent();
    current.push(frame);
    currentBytes += cost;
  }
  closeCurrent();

  if (batches.length === 0) batches.push([]);
  return { batches, oversized };
};
