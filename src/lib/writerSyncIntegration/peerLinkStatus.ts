import type { DeviceId } from 'writer-sync/core';
import type { PeerLinkState } from 'writer-sync/providers/webrtc';

/**
 * Which paired devices this page is currently connected to, and which one it was
 * connected to and lost.
 *
 * The distinction is the whole point. Sessions do not survive a reload — a
 * session is born in the pairing exchange and nowhere else — so "not connected"
 * is the resting state on every app start, not a fault. A surface that warned
 * about it would warn on every launch and mean nothing.
 *
 * So the store keeps no record of a device it has not seen working. `dropped` is
 * reachable only from `connected`, which is the memory: an interruption on a
 * link that never came up removes the entry rather than marking it, and there is
 * no separate "was ever connected" flag to keep in step.
 *
 * Page-lifetime by design, mirroring {@link peerSessionRegistry} — nothing here
 * is persisted, so a reload starts silent.
 */

/** What a device's link amounts to for a person reading a device list. */
export type DeviceLinkState = 'connecting' | 'connected' | 'dropped';

export type DeviceLinkStates = Readonly<Record<string, DeviceLinkState>>;

/**
 * What an observed link state does to what is remembered.
 *
 * `undefined` means forget the device: either this side tore the link down, or
 * it failed without ever having worked.
 */
const nextFor = (
  observed: PeerLinkState,
  previous: DeviceLinkState | undefined,
): DeviceLinkState | undefined => {
  if (observed === 'connected') return 'connected';
  if (observed === 'connecting') return 'connecting';
  if (observed === 'closed') return undefined;
  return previous === 'connected' || previous === 'dropped' ? 'dropped' : undefined;
};

/** The record of truth; the snapshot below is derived from it on every change. */
const held = new Map<string, DeviceLinkState>();
let states: DeviceLinkStates = {};
const listeners = new Set<() => void>();

const publish = (): void => {
  states = Object.fromEntries(held);
  for (const listener of [...listeners]) listener();
};

export const peerLinkStatus = {
  /**
   * The states as they stand. The same object until something actually changes,
   * because a snapshot that differed on every read would spin
   * `useSyncExternalStore` forever.
   */
  current: (): DeviceLinkStates => states,
  /** Whether any device was connected and is not any more. */
  dropped: (): boolean => Object.values(states).includes('dropped'),
  /** Record what a session reported about one device's link. */
  observe: (deviceId: DeviceId, observed: PeerLinkState): void => {
    const key = String(deviceId);
    const previous = held.get(key);
    const next = nextFor(observed, previous);
    if (next === previous) return;
    if (next === undefined) held.delete(key);
    else held.set(key, next);
    publish();
  },
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Drop everything remembered. For tests, and for a signed-out account. */
  reset: (): void => {
    held.clear();
    publish();
  },
};
