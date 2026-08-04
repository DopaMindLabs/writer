import { describe, expect, it } from 'vitest';
import { asDeviceId } from 'writer-sync/core';
import {
  PairingError,
  PairingErrorCode,
  type AuthenticatedPeerParameters,
} from 'writer-sync/pairing';
import {
  failureActionFor,
  initialExchangeState,
  pairingExchangeReducer,
  type PairingExchangeState,
} from './pairingExchangeReducer';

const peer = (): AuthenticatedPeerParameters => ({
  deviceId: asDeviceId('peer-device'),
  publicIdentityJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  peerEphemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'e', y: 'f' },
  transcript: new Uint8Array([1, 2, 3]),
  verificationCode: '048213',
  expiresAt: Date.now() + 300_000,
});

const afterOffer = (): PairingExchangeState =>
  pairingExchangeReducer(initialExchangeState, {
    type: 'offer-ready',
    payload: 'encoded',
    sessionId: 'session-1',
  });

describe('pairingExchangeReducer', () => {
  it('starts by gathering a code on this device, asking nothing', () => {
    expect(initialExchangeState.phase).toBe('creating');
    expect(initialExchangeState.role).toBe('initiator');
  });

  it('waits for the peer once the offer is ready', () => {
    const state = afterOffer();

    expect(state.phase).toBe('awaiting-peer');
    expect(state.offerPayload).toBe('encoded');
    expect(state.sessionId).toBe('session-1');
  });

  it('notes a device pointed at its own screen, keeping the code up', () => {
    const state = pairingExchangeReducer(afterOffer(), { type: 'own-code-scanned' });

    expect(state.ownCodeScanned).toBe(true);
    expect(state.offerPayload).toBe('encoded');
    expect(state.phase).toBe('awaiting-peer');
  });

  it('drops its own offer when it turns out to be the answering device', () => {
    // A device cannot answer a description it authored, so the code it was
    // showing is not one anybody can finish the exchange with.
    const state = pairingExchangeReducer(afterOffer(), { type: 'answering' });

    expect(state.role).toBe('joiner');
    expect(state.phase).toBe('authenticating');
    expect(state.offerPayload).toBeNull();
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

  it('holds the answering device at the same gate, with a reply to hand back', () => {
    const answering = pairingExchangeReducer(afterOffer(), { type: 'answering' });
    const state = pairingExchangeReducer(answering, {
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

  it('carries a nameable failure reason, and clears it on the next failure', () => {
    const tooLarge = pairingExchangeReducer(afterOffer(), {
      type: 'failed',
      reason: 'too-large',
    });
    expect(tooLarge.phase).toBe('failed');
    expect(tooLarge.failureReason).toBe('too-large');

    // A later generic failure must not inherit the old reason.
    expect(pairingExchangeReducer(tooLarge, { type: 'failed' }).failureReason).toBeNull();
  });

  it('clears the failure reason on a restart', () => {
    const tooLarge = pairingExchangeReducer(afterOffer(), {
      type: 'failed',
      reason: 'too-large',
    });

    expect(pairingExchangeReducer(tooLarge, { type: 'restart' }).failureReason).toBeNull();
  });
});

describe('failureActionFor', () => {
  it('names only an oversized payload', () => {
    expect(
      failureActionFor(new PairingError(PairingErrorCode.OversizedPayload, 'too big')),
    ).toEqual({ type: 'failed', reason: 'too-large' });
  });

  it('names an expired code, whose fix is a fresh one', () => {
    expect(
      failureActionFor(new PairingError(PairingErrorCode.Expired, 'payload has expired')),
    ).toEqual({ type: 'failed', reason: 'expired' });
  });

  it('names a known device that proved a different identity', () => {
    expect(
      failureActionFor(new PairingError(PairingErrorCode.TrustedKeyMismatch, 'key differs')),
    ).toEqual({ type: 'failed', reason: 'trusted-key-mismatch' });
  });

  it('keeps every other failure generic', () => {
    expect(
      failureActionFor(new PairingError(PairingErrorCode.BadSignature, 'forged')),
    ).toEqual({ type: 'failed' });
    expect(failureActionFor(new Error('network down'))).toEqual({ type: 'failed' });
    expect(failureActionFor('a thrown string')).toEqual({ type: 'failed' });
  });
});
