import { describe, it, expect, afterEach } from 'vitest';
import {
  encodeInvite,
  parseInviteFromLocation,
  scrubInviteFragment,
  type InviteLink,
} from './invite';

const setLocation = (path: string): void => {
  window.history.replaceState(null, '', path);
};

const invite: InviteLink = {
  roomId: 'room-1',
  relayUrl: 'wss://relay.example/collab',
  inviteSecret: new Uint8Array([1, 2, 3, 250, 255, 0, 128]),
  role: 'writer',
};

afterEach(() => {
  setLocation('/');
});

describe('invite', () => {
  it('round-trips an invite through encode → parse', () => {
    setLocation(`/${encodeInvite(invite)}`);
    const parsed = parseInviteFromLocation();
    expect(parsed).not.toBeNull();
    expect(parsed?.roomId).toBe(invite.roomId);
    expect(parsed?.relayUrl).toBe(invite.relayUrl);
    expect(parsed?.role).toBe(invite.role);
    expect([...(parsed?.inviteSecret ?? [])]).toEqual([...invite.inviteSecret]);
  });

  it('returns null for an unrelated hash route', () => {
    setLocation('/#/settings');
    expect(parseInviteFromLocation()).toBeNull();
  });

  it('returns null when only some invite params are present', () => {
    setLocation('/#/?collab=room-1&relay=wss://r');
    expect(parseInviteFromLocation()).toBeNull();
  });

  it('scrubs the invite params while preserving the route and other search params', () => {
    setLocation('/#/s/space-1?tab=notes&collab=room-1&relay=wss://r&invite=AAEC&role=reader');
    scrubInviteFragment();
    expect(window.location.hash).toBe('#/s/space-1?tab=notes');
    expect(parseInviteFromLocation()).toBeNull();
  });

  it('leaves a hash with no invite params untouched', () => {
    setLocation('/#/help/getting-started');
    scrubInviteFragment();
    expect(window.location.hash).toBe('#/help/getting-started');
  });
});
