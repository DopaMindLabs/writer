import { describe, expect, it } from 'vitest';
import { CATCH_UP_MESSAGE_KINDS, isCatchUpMessageKind } from '../src/operations/index';
import {
  ROOT_TRANSFER_MESSAGE_KINDS,
  isRootTransferMessageKind,
} from '../src/pairing/index';

/**
 * Two protocols share one pairing channel, and a host routes between them by
 * message kind. Neither can be told apart by its version: both number
 * themselves from 1. So the kinds have to do it, which holds only while no kind
 * belongs to both protocols.
 *
 * That invariant is invisible from inside either codec — this is where it is
 * stated, so adding a kind to one protocol that the other already speaks fails
 * here rather than misrouting a message on a real device.
 */

describe('pairing and catch-up message kinds', () => {
  it('are exactly the kinds their codecs speak', () => {
    // Named rather than counted: a protocol gaining or losing a kind should
    // bring whoever changed it here, to decide what it means for routing.
    expect([...ROOT_TRANSFER_MESSAGE_KINDS].sort()).toEqual([
      'holds-root',
      'needs-root',
      'ready',
      'root',
    ]);
    expect([...CATCH_UP_MESSAGE_KINDS].sort()).toEqual([
      'ack',
      'attachment-chunk',
      'attachment-offer',
      'attachment-request',
      'attachment-unavailable',
      'frames',
      'manifest',
      'request',
    ]);
  });

  it('name nothing in common', () => {
    const inBoth = ROOT_TRANSFER_MESSAGE_KINDS.filter((kind) => isCatchUpMessageKind(kind));
    const alsoInBoth = CATCH_UP_MESSAGE_KINDS.filter((kind) =>
      isRootTransferMessageKind(kind),
    );

    expect(inBoth).toEqual([]);
    expect(alsoInBoth).toEqual([]);
  });

  it('are each recognised by their own protocol', () => {
    expect(
      ROOT_TRANSFER_MESSAGE_KINDS.every((kind) => isRootTransferMessageKind(kind)),
    ).toBe(true);
    expect(CATCH_UP_MESSAGE_KINDS.every((kind) => isCatchUpMessageKind(kind))).toBe(true);
  });

  it('are recognised by neither protocol when a peer invents one', () => {
    expect(isRootTransferMessageKind('send-me-everything')).toBe(false);
    expect(isCatchUpMessageKind('send-me-everything')).toBe(false);
  });

  it('are recognised by neither protocol for a property every object inherits', () => {
    // A peer chooses the kind string, so the lookup must answer for what an
    // object carries by inheritance as firmly as for anything else.
    expect(isRootTransferMessageKind('toString')).toBe(false);
    expect(isRootTransferMessageKind('constructor')).toBe(false);
    expect(isCatchUpMessageKind('toString')).toBe(false);
    expect(isCatchUpMessageKind('constructor')).toBe(false);
  });
});
