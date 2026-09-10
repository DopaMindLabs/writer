import { toBase64Url } from '../crypto/base64url';
import type { DeviceIdentityKeys } from '../crypto/deviceIdentity';
import {
  generatePairingEphemeral,
  type PairingEphemeralKeys,
} from '../crypto/pairingKeyAgreement';
import {
  PairingError,
  PairingErrorCode,
  type PairingAnswer,
  type PairingOffer,
} from './pairing.types';
import {
  bindTranscript,
  canonicalHash,
  identityFieldsFor,
  mintAnswer,
  mintOffer,
  type IdentityFields,
} from './pairingExchange';
import { pairingPayloadBytes } from './pairingCodec';
import { SESSION_TTL_MILLIS, validateInboundPayload } from './payloadValidation';
import type { ReplayCache } from './replayCache';
import type {
  AuthenticatedPeerParameters,
  CreateOfferOptions,
  SignallingAdapter,
} from './signalling.types';

/**
 * Writer's default signalling adapter, specified in runbook §21: the complete
 * connection parameters travel in two QR symbols and nothing else.
 *
 * The peer connection is injected as {@link SignallingPeer} rather than
 * imported, so this module stays innocent of WebRTC — a native host that reaches
 * its peer over the LAN substitutes its own and every acceptance check still
 * applies.
 *
 * The adapter authenticates; it does **not** confirm. Resolving `acceptAnswer`
 * means the two transcripts agree, never that a human has compared the codes —
 * that gate lives in the pairing state machine.
 */

/** The connection this adapter wraps. `PeerSession` satisfies it structurally. */
export interface SignallingPeer {
  createOffer: () => Promise<string>;
  acceptOffer: (sdp: string) => Promise<string>;
  acceptAnswer: (sdp: string) => Promise<void>;
}

export interface QrSignallingAdapterOptions {
  identity: DeviceIdentityKeys;
  peer: SignallingPeer;
  replayCache: ReplayCache;
  /**
   * Injected so tests need no real clock. The `replayCache` must be built on the
   * same clock: entries stamped from one and evicted against another expire
   * immediately, leaving the replay defence inert while appearing to work.
   */
  now?: () => number;
  /** Injected so tests need no real entropy. */
  randomBytes?: (length: number) => Uint8Array;
}

export interface QrSignallingAdapter extends SignallingAdapter {
  /**
   * What this device has authenticated, or `null` until it holds both payloads.
   * The joiner reaches this state one step earlier than the initiator, which is
   * why it is an accessor rather than only a return value.
   */
  parameters: () => AuthenticatedPeerParameters | null;
  /**
   * This session's ephemeral private key, or `null` before one is minted.
   *
   * Exposed because the root secret arrives sealed to this session's ephemeral
   * public key, and only its private half can open it. The key is
   * non-extractable and belongs to one exchange, so what escapes here is a
   * handle usable for this session and nothing else — the raw material never
   * leaves Web Crypto.
   */
  sessionPrivateKey: () => CryptoKey | null;
  /**
   * Let go of everything this exchange accumulated: the ephemeral key, what it
   * authenticated, and the transcript state an answer would be checked against.
   *
   * Idempotent, and terminal — a disposed adapter cannot continue an exchange.
   * A session whose deadline has passed must not still be able to open a
   * wrapper sealed to its ephemeral key, which is the whole point of having a
   * deadline at all.
   */
  dispose: () => void;
}

/** Everything one exchange accumulates. Created per adapter, never shared. */
interface ExchangeState {
  ephemeral: PairingEphemeralKeys | null;
  /** Canonical offer bytes, whichever device produced them. */
  offerBytes: Uint8Array | null;
  offerHash: string | null;
  sessionId: string | null;
  /** The offer's own deadline, kept so the session can bind to the earlier one. */
  offerExpiresAt: number | null;
  authenticated: AuthenticatedPeerParameters | null;
}

/**
 * The adapter's operations are module-level functions over this context rather
 * than closures, so each stays a readable unit instead of one long factory.
 */
interface ExchangeContext {
  options: QrSignallingAdapterOptions;
  state: ExchangeState;
  now: () => number;
  nonce: () => string;
}

const NONCE_BYTES = 16;

/**
 * One ephemeral pair per session, generated on first use and never reused —
 * §10 requires freshness, and a lazily created pair keeps an adapter that is
 * built but never driven from consuming entropy.
 */
const fieldsFor = async (context: ExchangeContext): Promise<IdentityFields> => {
  context.state.ephemeral ??= await generatePairingEphemeral();
  return identityFieldsFor({
    identity: context.options.identity,
    ephemeral: context.state.ephemeral,
  });
};

const createOfferFor = async (
  context: ExchangeContext,
  offerOptions: CreateOfferOptions,
): Promise<PairingOffer> => {
  const minted = await mintOffer({
    identity: context.options.identity,
    fields: await fieldsFor(context),
    sessionId: offerOptions.sessionId,
    expiresAt: offerOptions.expiresAt,
    sdp: await context.options.peer.createOffer(),
    nonce: context.nonce(),
  });
  context.state.sessionId = offerOptions.sessionId;
  context.state.offerBytes = minted.bytes;
  context.state.offerHash = minted.hash;
  context.state.offerExpiresAt = offerOptions.expiresAt;
  return minted.offer;
};

const acceptOfferFor = async (
  context: ExchangeContext,
  offer: PairingOffer,
): Promise<PairingAnswer> => {
  // The joiner holds no session of its own to compare against; it adopts the
  // initiator's id, and the answer it returns is what binds the two together.
  await validateInboundPayload({
    payload: offer,
    expectedSessionId: offer.sessionId,
    replayCache: context.options.replayCache,
    now: context.now(),
  });
  const offerBytes = pairingPayloadBytes(offer);
  const minted = await mintAnswer({
    identity: context.options.identity,
    fields: await fieldsFor(context),
    sessionId: offer.sessionId,
    expiresAt: context.now() + SESSION_TTL_MILLIS,
    sdp: await context.options.peer.acceptOffer(offer.sdp),
    nonce: context.nonce(),
    offerHash: await canonicalHash(offerBytes),
  });
  context.state.sessionId = offer.sessionId;
  context.state.offerBytes = offerBytes;
  context.state.offerExpiresAt = offer.expiresAt;
  context.state.authenticated = await bindTranscript({
    peer: offer,
    offerBytes,
    answerBytes: minted.bytes,
    expiresAt: Math.min(offer.expiresAt, minted.answer.expiresAt),
  });
  return minted.answer;
};

const acceptAnswerFor = async (
  context: ExchangeContext,
  answer: PairingAnswer,
): Promise<AuthenticatedPeerParameters> => {
  const { offerBytes, offerHash, sessionId, offerExpiresAt } = context.state;
  if (
    sessionId === null ||
    offerHash === null ||
    offerBytes === null ||
    offerExpiresAt === null
  ) {
    throw new PairingError(
      PairingErrorCode.InvalidState,
      'an answer arrived before this device created an offer',
    );
  }
  await validateInboundPayload({
    payload: answer,
    expectedSessionId: sessionId,
    replayCache: context.options.replayCache,
    now: context.now(),
    expectedOfferHash: offerHash,
  });
  await context.options.peer.acceptAnswer(answer.sdp);
  const authenticated = await bindTranscript({
    peer: answer,
    offerBytes,
    answerBytes: pairingPayloadBytes(answer),
    expiresAt: Math.min(offerExpiresAt, answer.expiresAt),
  });
  context.state.authenticated = authenticated;
  return authenticated;
};

export const createQrSignallingAdapter = (
  options: QrSignallingAdapterOptions,
): QrSignallingAdapter => {
  const randomBytes =
    options.randomBytes ?? ((length) => crypto.getRandomValues(new Uint8Array(length)));
  const context: ExchangeContext = {
    options,
    state: {
      ephemeral: null,
      offerBytes: null,
      offerHash: null,
      sessionId: null,
      offerExpiresAt: null,
      authenticated: null,
    },
    now: options.now ?? (() => Date.now()),
    nonce: () => toBase64Url(randomBytes(NONCE_BYTES)),
  };

  return {
    createOffer: (offerOptions) => createOfferFor(context, offerOptions),
    acceptOffer: (offer) => acceptOfferFor(context, offer),
    acceptAnswer: (answer) => acceptAnswerFor(context, answer),
    parameters: () => context.state.authenticated,
    sessionPrivateKey: () => context.state.ephemeral?.privateKey ?? null,
    dispose: () => {
      context.state.ephemeral = null;
      context.state.offerBytes = null;
      context.state.offerHash = null;
      context.state.sessionId = null;
      context.state.offerExpiresAt = null;
      context.state.authenticated = null;
    },
  };
};
