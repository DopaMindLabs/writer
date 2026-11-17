import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import { peerLinkStatus } from './peerLinkStatus';

/**
 * The one rule this store exists for: a device is only ever reported as dropped
 * if it was connected first. Everything else — a reload, a pairing that never
 * came up, a teardown this device asked for — leaves nothing to report.
 */

const PEER = asDeviceId('peer-1');
const OTHER = asDeviceId('peer-2');

beforeEach(() => {
  peerLinkStatus.reset();
});

describe('peerLinkStatus', () => {
  it('starts empty, so a fresh page reports nothing about anything', () => {
    expect(peerLinkStatus.current()).toEqual({});
    expect(peerLinkStatus.dropped()).toBe(false);
  });

  it('follows a link up', () => {
    peerLinkStatus.observe(PEER, 'connecting');
    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connecting' });

    peerLinkStatus.observe(PEER, 'connected');

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connected' });
  });

  it('reports a drop only for a link that was connected', () => {
    peerLinkStatus.observe(PEER, 'connecting');
    peerLinkStatus.observe(PEER, 'connected');

    peerLinkStatus.observe(PEER, 'interrupted');

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'dropped' });
    expect(peerLinkStatus.dropped()).toBe(true);
  });

  it('says nothing when a pairing that never came up fails', () => {
    // Nothing was ever working, so there is nothing to have lost — a device that
    // could not connect in the first place is not a drop.
    peerLinkStatus.observe(PEER, 'connecting');

    peerLinkStatus.observe(PEER, 'interrupted');

    expect(peerLinkStatus.current()).toEqual({});
    expect(peerLinkStatus.dropped()).toBe(false);
  });

  it('stays quiet about a link it has never heard of', () => {
    peerLinkStatus.observe(PEER, 'interrupted');

    expect(peerLinkStatus.current()).toEqual({});
  });

  it('holds a drop through further interruptions of the same link', () => {
    peerLinkStatus.observe(PEER, 'connected');
    peerLinkStatus.observe(PEER, 'interrupted');

    peerLinkStatus.observe(PEER, 'interrupted');

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'dropped' });
  });

  it('clears a drop when the same device connects again', () => {
    peerLinkStatus.observe(PEER, 'connected');
    peerLinkStatus.observe(PEER, 'interrupted');

    peerLinkStatus.observe(PEER, 'connected');

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connected' });
    expect(peerLinkStatus.dropped()).toBe(false);
  });

  it('forgets a link this device tore down, rather than mourning it', () => {
    // A local close is not a fault: closing the tab, unpairing, superseding a
    // session. Reporting it would put a warning in front of a user who caused it.
    peerLinkStatus.observe(PEER, 'connected');

    peerLinkStatus.observe(PEER, 'closed');

    expect(peerLinkStatus.current()).toEqual({});
    expect(peerLinkStatus.dropped()).toBe(false);
  });

  it('keeps devices apart', () => {
    peerLinkStatus.observe(PEER, 'connected');
    peerLinkStatus.observe(OTHER, 'connected');

    peerLinkStatus.observe(OTHER, 'interrupted');

    expect(peerLinkStatus.current()).toEqual({ [PEER]: 'connected', [OTHER]: 'dropped' });
  });

  it('hands back the same object until something actually changes', () => {
    // A snapshot that differed on every read would spin `useSyncExternalStore`
    // forever.
    peerLinkStatus.observe(PEER, 'connected');
    const first = peerLinkStatus.current();

    peerLinkStatus.observe(PEER, 'connected');

    expect(peerLinkStatus.current()).toBe(first);
  });

  it('tells subscribers about real changes only', () => {
    const listener = vi.fn();
    peerLinkStatus.subscribe(listener);

    peerLinkStatus.observe(PEER, 'connected');
    peerLinkStatus.observe(PEER, 'connected');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('stops telling a subscriber that has unsubscribed', () => {
    const listener = vi.fn();
    const off = peerLinkStatus.subscribe(listener);

    off();
    peerLinkStatus.observe(PEER, 'connected');

    expect(listener).not.toHaveBeenCalled();
  });
});
