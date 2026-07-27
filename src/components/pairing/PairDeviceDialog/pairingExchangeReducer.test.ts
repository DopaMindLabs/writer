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

const begun = (role: 'initiator' | 'joiner'): PairingExchangeState =>
  pairingExchangeReducer(initialExchangeState, { type: 'begin', role });

const afterOffer = (): PairingExchangeState =>
  pairingExchangeReducer(begun('initiator'), {
    type: 'offer-ready',
    payload: 'encoded',
    sessionId: 'session-1',
  });

describe('pairingExchangeReducer', () => {
  it('starts by asking which half of the exchange this device runs', () => {
    expect(initialExchangeState.phase).toBe('choosing');
    expect(initialExchangeState.role).toBeNull();
  });

  it('gathers first when this device shows the code', () => {
    expect(begun('initiator').phase).toBe('creating');
  });

  it('reads first when this device is the one scanning', () => {
    // Nothing to gather yet: the joiner's connection is answered against an
    // offer it has not seen.
    expect(begun('joiner').phase).toBe('awaiting-offer');
  });

  it('waits for the peer once the offer is ready', () => {
    const state = afterOffer();

    expect(state.phase).toBe('awaiting-peer');
    expect(state.offerPayload).toBe('encoded');
    expect(state.sessionId).toBe('session-1');
  });

  it('keeps the offer on screen while the peer payload is checked', () => {
    const state = pairingExchangeReducer(afterOffer(), { type: 'peer-payload-received' });

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

  it('holds the joiner at the same gate, with a reply for the peer to read', () => {
    const state = pairingExchangeReducer(begun('joiner'), {
      type: 'answer-ready',
      payload: 'encoded-answer',
      sessionId: 'session-1',
      peer: peer(),
    });

    expect(state.phase).toBe('awaiting-confirmation');
    expect(state.answerPayload).toBe('encoded-answer');
    expect(state.sessionId).toBe('session-1');
    expect(state.peer?.verificationCode).toBe('048213');
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

  it('discards a previous attempt when a role is chosen again', () => {
    // Reopening after a failure must not leave the earlier offer on screen.
    const failed = pairingExchangeReducer(afterOffer(), { type: 'failed' });

    expect(pairingExchangeReducer(failed, { type: 'begin', role: 'initiator' })).toEqual({
      ...initialExchangeState,
      role: 'initiator',
      phase: 'creating',
    });
  });
});
