import { PairingError, PairingErrorCode } from './pairing.types';

/**
 * Bounded multi-symbol carriage, specified in `docs/pairing-protocol.md` §6.
 *
 * An encoded payload usually fits one QR symbol, but a session description with
 * several ICE candidates can exceed it. Splitting is bounded and ordered rather
 * than open-ended: never truncate the payload, never lower validation to make it
 * fit, and never accept an unbounded number of parts from a scanner.
 *
 * Each part is prefixed `W1:<sessionId>:<index>/<total>:` so a receiver can tell
 * parts of one session apart from a stray scan without parsing the payload.
 */

// 2600 keeps a typical offer (~1.2–2k chars) in a single symbol while leaving
// headroom under the encoder's 2953-char version-40/EC-L ceiling for the
// `W1:<sessionId>:<index>/<total>:` prefix.
export const MAX_QR_CHUNK_BYTES = 2600;
export const MAX_QR_PARTS = 8;

const PREFIX = /^W1:([A-Za-z0-9_-]+):(\d+)\/(\d+):(.*)$/s;

export interface QrPart {
  sessionId: string;
  /** One-based, so a symbol reads as "2/3" to a human debugging a scan. */
  index: number;
  total: number;
  body: string;
}

/** Split encoded payload text into an ordered, bounded sequence of symbols. */
export const splitIntoQrParts = (options: {
  sessionId: string;
  text: string;
}): string[] => {
  const { sessionId, text } = options;
  const total = Math.max(1, Math.ceil(text.length / MAX_QR_CHUNK_BYTES));
  if (total > MAX_QR_PARTS) {
    throw new PairingError(
      PairingErrorCode.OversizedPayload,
      `payload needs ${String(total)} symbols, over the ${String(MAX_QR_PARTS)} limit`,
    );
  }
  return Array.from({ length: total }, (_unused, part) => {
    const body = text.slice(part * MAX_QR_CHUNK_BYTES, (part + 1) * MAX_QR_CHUNK_BYTES);
    return `W1:${sessionId}:${String(part + 1)}/${String(total)}:${body}`;
  });
};

/** Parse one scanned symbol. */
export const parseQrPart = (symbol: string): QrPart => {
  const match = PREFIX.exec(symbol);
  if (!match) throw new PairingError(PairingErrorCode.BadQrSequence, 'unrecognised symbol');
  const [, sessionId, index, total, body] = match;
  const part = { sessionId, index: Number(index), total: Number(total), body };
  if (part.total < 1 || part.total > MAX_QR_PARTS) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'implausible part count');
  }
  if (part.index < 1 || part.index > part.total) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'part index out of range');
  }
  return part;
};

/**
 * Reassemble a complete set. Every index must appear exactly once, all parts
 * must agree on the session and the total, and the set must be complete —
 * a receiver that accepted a gap would hand malformed bytes to the codec and
 * blame the payload for what was really a missed scan.
 */
export const joinQrParts = (parts: readonly QrPart[]): string => {
  if (parts.length === 0) throw new PairingError(PairingErrorCode.BadQrSequence, 'no parts');
  const { sessionId, total } = parts[0];
  if (parts.some((part) => part.sessionId !== sessionId)) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'parts from different sessions');
  }
  if (parts.some((part) => part.total !== total)) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'parts disagree on the total');
  }
  const byIndex = new Map(parts.map((part) => [part.index, part]));
  if (byIndex.size !== parts.length) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'duplicate part index');
  }
  if (byIndex.size !== total) {
    throw new PairingError(PairingErrorCode.BadQrSequence, 'incomplete sequence');
  }
  return Array.from({ length: total }, (_unused, i) => {
    const part = byIndex.get(i + 1);
    if (!part) throw new PairingError(PairingErrorCode.BadQrSequence, 'missing part');
    return part.body;
  }).join('');
};
