import type { PairingRootWrapper } from '../crypto/keyVault.types';
import { PairingError, PairingErrorCode } from './pairing.types';

/**
 * What two confirmed devices say to each other about key material, and its
 * strict codec.
 *
 * A freshly paired device holds no root secret, so it can decrypt nothing and
 * would sit connected and empty. The root reaches it here — over the established
 * channel, after a human has confirmed the codes, never in a QR payload
 * (`docs/pairing-protocol.md` §11).
 *
 * Neither device is told which part to play. Each says whether it holds key
 * material, because the roles the pairing exchange settled say nothing about
 * which device has been used before: the one that scanned may equally be the one
 * that has everything.
 *
 * Everything arriving over a peer channel is untrusted, however well the pairing
 * authenticated the peer. Structure and size are checked here; whether a wrapper
 * is genuine is decided by Web Crypto opening it under the session transcript,
 * which no malformed message can fake.
 */

export const ROOT_TRANSFER_VERSION = 1;

/**
 * A sealed root is a fixed handful of bytes — an AES-GCM wrapper around a
 * 32-byte secret — so anything of this order is not a root and is refused
 * before it is parsed further.
 */
export const MAX_WRAPPED_BYTES = 4096;

export type RootTransferMessage =
  | { v: typeof ROOT_TRANSFER_VERSION; kind: 'holds-root' }
  | { v: typeof ROOT_TRANSFER_VERSION; kind: 'needs-root' }
  /**
   * This device has nothing left to say about keys. Sent after settling and
   * repeated until the peer says the same, so both leave the conversation
   * together — whatever follows on this channel belongs to the next protocol,
   * and a device still reading for keys would swallow it.
   */
  | { v: typeof ROOT_TRANSFER_VERSION; kind: 'ready' }
  | {
      v: typeof ROOT_TRANSFER_VERSION;
      kind: 'root';
      wrapper: PairingRootWrapper;
      /**
       * The rotation epoch the root's content key is derived at. Carried
       * because the wrapper holds the root alone: a receiver that guessed the
       * epoch would derive a key that decrypts nothing, and would have no way
       * to tell that from a peer with no data.
       */
      epoch: number;
    };

/**
 * Every kind this protocol speaks, as a lookup so the compiler proves the list
 * stays complete: a kind added to or dropped from the union above stops this
 * table from satisfying it.
 */
const ROOT_TRANSFER_KIND_TABLE = {
  'holds-root': true,
  'needs-root': true,
  ready: true,
  root: true,
} satisfies Record<RootTransferMessage['kind'], true>;

export const ROOT_TRANSFER_MESSAGE_KINDS: readonly RootTransferMessage['kind'][] =
  Object.keys(ROOT_TRANSFER_KIND_TABLE) as RootTransferMessage['kind'][];

/**
 * Whether a kind belongs to this protocol, for a host that carries more than one
 * protocol over a single channel and has to know whose message it is holding.
 *
 * Answers for a kind alone, because that is all a router can read without
 * decoding: the version field cannot separate protocols that each number
 * themselves from 1. Own properties only — a peer chooses the string, and
 * `toString` is not a kind.
 */
export const isRootTransferMessageKind = (kind: string): boolean =>
  Object.hasOwn(ROOT_TRANSFER_KIND_TABLE, kind);

const refuse = (reason: string): never => {
  throw new PairingError(PairingErrorCode.MalformedPayload, `root transfer: ${reason}`);
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : refuse('a message must be an object');

const decodeWrapper = (value: unknown): PairingRootWrapper => {
  const { ephemeralPublicJwk, iv, wrapped } = asRecord(value);
  if (typeof iv !== 'string' || typeof wrapped !== 'string') {
    return refuse('a wrapper carries an iv and sealed bytes');
  }
  if (typeof ephemeralPublicJwk !== 'object' || ephemeralPublicJwk === null) {
    return refuse('a wrapper names the key it was sealed to');
  }
  if (wrapped.length > MAX_WRAPPED_BYTES || iv.length > MAX_WRAPPED_BYTES) {
    return refuse('a wrapper larger than an root secret');
  }
  return { ephemeralPublicJwk, iv, wrapped };
};

export const encodeRootTransferMessage = (message: RootTransferMessage): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(message));

export const decodeRootTransferMessage = (bytes: Uint8Array): RootTransferMessage => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    // The reason is for developers: peer-supplied text never reaches the user.
    return refuse('unreadable bytes');
  }
  const message = asRecord(parsed);
  if (message.v !== ROOT_TRANSFER_VERSION) refuse('an unsupported protocol version');
  if (
    message.kind === 'holds-root' ||
    message.kind === 'needs-root' ||
    message.kind === 'ready'
  ) {
    return { v: ROOT_TRANSFER_VERSION, kind: message.kind };
  }
  if (message.kind === 'root') {
    const { epoch } = message;
    if (typeof epoch !== 'number' || !Number.isInteger(epoch) || epoch < 1) {
      return refuse('a root names the epoch its key is derived at');
    }
    return {
      v: ROOT_TRANSFER_VERSION,
      kind: 'root',
      wrapper: decodeWrapper(message.wrapper),
      epoch,
    };
  }
  return refuse('an unknown message kind');
};
