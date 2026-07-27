import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import type { AuthenticatedPeerParameters } from 'writer-sync/pairing';
import {
  initialExchangeState,
  pairingExchangeReducer,
  type PairingExchangeState,
} from './pairingExchangeReducer';

const peer = (): AuthenticatedPeerParameters => ({
  deviceId: asDeviceId('peer-device'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  transcript: new Uint8Array([1, 2, 3]),
  verificationCode: '048213',
});

const afterOffer = (): PairingExchangeState =>
  pairingExchangeReducer(initialExchangeState, {
    type: 'offer-ready',
    payload: 'encoded',
    sessionId: 'session-1',
  });

describe('pairingExchangeReducer', () => {
  it('starts by gathering', () => {
    expect(initialExchangeState.phase).toBe('creating');
    expect(initialExchangeState.offerPayload).toBeNull();
  });

  it('waits for the peer once the offer is ready', () => {
    const state = afterOffer();

    expect(state.phase).toBe('awaiting-peer');
    expect(state.offerPayload).toBe('encoded');
    expect(state.sessionId).toBe('session-1');
  });

  it('keeps the offer on screen while the answer is checked', () => {
    const state = pairingExchangeReducer(afterOffer(), { type: 'answer-received' });

    expect(state.phase).toBe('authenticating');
    expect(state.offerPayload).toBe('encoded');
  });

  it('holds at the confirmation gate once authenticated', () => {
    const authenticated = pairingExchangeReducer(afterOffer(), {
      type: 'authenticated',
      peer: peer(),
    });

    expect(authenticated.phase).toBe('awaiting-confirmation');
    expect(authenticated.peer?.verificationCode).toBe('048213');
  });

  it('completes only on an explicit confirmation', () => {
    const authenticated = pairingExchangeReducer(afterOffer(), {
      type: 'authenticated',
      peer: peer(),
    });

    expect(pairingExchangeReducer(authenticated, { type: 'confirmed' }).phase).toBe('complete');
  });

  it('fails from any phase', () => {
    expect(pairingExchangeReducer(afterOffer(), { type: 'failed' }).phase).toBe('failed');
  });

  it('discards everything on a restart', () => {
    const authenticated = pairingExchangeReducer(afterOffer(), {
      type: 'authenticated',
      peer: peer(),
    });

    expect(pairingExchangeReducer(authenticated, { type: 'restart' })).toEqual(
      initialExchangeState,
    );
  });
});
