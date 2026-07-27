import { asDeviceId } from 'writer-sync/core';
import type { AuthenticatedPeerParameters } from 'writer-sync/pairing';
import type { PairingExchange } from './usePairingExchange';

/**
 * A pairing exchange fixed at one phase, for the views and stories that render
 * a phase without driving the protocol to reach it.
 */

export const fixturePeer = (): AuthenticatedPeerParameters => ({
  deviceId: asDeviceId('cGVlci1kZXZpY2UtaWQwMA'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  transcript: new Uint8Array([1, 2, 3]),
  verificationCode: '048213',
});

export const fixtureExchange = (
  overrides: Partial<PairingExchange> = {},
): PairingExchange => ({
  phase: 'creating',
  role: 'initiator',
  offerPayload: null,
  answerPayload: null,
  sessionId: null,
  peer: null,
  begin: () => undefined,
  submitOffer: () => undefined,
  acceptAnswer: () => undefined,
  confirm: () => undefined,
  ...overrides,
});
