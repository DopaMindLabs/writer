import { describe, expect, it } from 'vitest';
import {
  ROOT_TRANSFER_VERSION,
  decodeRootTransferMessage,
  encodeRootTransferMessage,
  type RootTransferMessage,
} from './rootTransferMessage';

/**
 * The three things two confirmed devices say to each other about key material.
 *
 * Everything arriving over a peer channel is untrusted however well the pairing
 * authenticated it, so a message is validated structurally and bounded before
 * anything acts on it — a wrapper is opened by Web Crypto, which is the only
 * thing that decides whether it is genuine.
 */

const wrapper = () => ({
  ephemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'x'.repeat(43), y: 'y'.repeat(43) },
  iv: 'aXYtYnl0ZXMtMDAwMA',
  wrapped: 'd3JhcHBlZC1yb290LWJ5dGVz',
});

const roundTrip = (message: RootTransferMessage): RootTransferMessage =>
  decodeRootTransferMessage(encodeRootTransferMessage(message));

describe('root transfer codec', () => {
  it('carries a device that already holds key material', () => {
    expect(roundTrip({ v: ROOT_TRANSFER_VERSION, kind: 'holds-root' })).toEqual({
      v: ROOT_TRANSFER_VERSION,
      kind: 'holds-root',
    });
  });

  it('carries a device that needs key material', () => {
    expect(roundTrip({ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' })).toEqual({
      v: ROOT_TRANSFER_VERSION,
      kind: 'needs-root',
    });
  });

  it('carries the sealed root and the epoch it derives at', () => {
    const sealed = wrapper();

    const decoded = roundTrip({
      v: ROOT_TRANSFER_VERSION,
      kind: 'root',
      wrapper: sealed,
      epoch: 3,
    });

    expect(decoded).toEqual({
      v: ROOT_TRANSFER_VERSION,
      kind: 'root',
      wrapper: sealed,
      epoch: 3,
    });
  });

  it('refuses a root that names no epoch', () => {
    // Guessing it would derive a key that decrypts nothing, which looks exactly
    // like a peer that has no writing to send.
    const bytes = new TextEncoder().encode(
      JSON.stringify({ v: ROOT_TRANSFER_VERSION, kind: 'root', wrapper: wrapper() }),
    );

    expect(() => decodeRootTransferMessage(bytes)).toThrow();
  });

  it('refuses a message from a protocol version it does not speak', () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 2, kind: 'holds-root' }));

    expect(() => decodeRootTransferMessage(bytes)).toThrow();
  });

  it('refuses a kind it does not know', () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ v: ROOT_TRANSFER_VERSION, kind: 'send-me-everything' }),
    );

    expect(() => decodeRootTransferMessage(bytes)).toThrow();
  });

  it('refuses a wrapper missing any of its three parts', () => {
    const { iv, ...incomplete } = wrapper();
    void iv;
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        v: ROOT_TRANSFER_VERSION,
        kind: 'root',
        wrapper: incomplete,
        epoch: 1,
      }),
    );

    expect(() => decodeRootTransferMessage(bytes)).toThrow();
  });

  it('refuses a wrapper larger than an root secret could ever need', () => {
    // A peer cannot make this device allocate for a payload that is not a root:
    // the sealed material is a fixed handful of bytes, not a file.
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        v: ROOT_TRANSFER_VERSION,
        kind: 'root',
        wrapper: { ...wrapper(), wrapped: 'A'.repeat(100_000) },
        epoch: 1,
      }),
    );

    expect(() => decodeRootTransferMessage(bytes)).toThrow();
  });

  it('refuses bytes that are not a message at all', () => {
    expect(() => decodeRootTransferMessage(new TextEncoder().encode('not json'))).toThrow();
  });
});
