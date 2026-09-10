import { PairingError, PairingErrorCode } from './pairing.types';
import { joinQrParts, parseQrPart, type QrPart } from './qrSequence';

/**
 * Collects the symbols of one multi-part payload as they are scanned.
 *
 * Scanning is not an ordered, reliable channel: a camera fires repeatedly at
 * whatever is in frame, so the same symbol arrives many times and the parts
 * arrive in whatever order the user happens to hold them up. The collector is
 * therefore idempotent per index and order-independent, and reports what is
 * still outstanding so the interface can say "hold up symbol 2" rather than
 * leaving the user guessing why nothing happens.
 *
 * A symbol from another session is refused rather than adopted. Silently
 * switching would let a stray code — or a substituted one — take over a scan
 * the user believes is still collecting their own device's answer.
 */

export interface QrCollectionProgress {
  /** The session every collected symbol belongs to, once one has arrived. */
  sessionId: string | null;
  received: number;
  total: number | null;
  /** One-based indices not yet scanned. */
  missing: number[];
  /** The reassembled payload once the set is complete, else `null`. */
  text: string | null;
}

export interface QrPartCollector {
  /** Take one scanned symbol; throws {@link PairingError} if it does not belong. */
  accept: (symbol: string) => QrCollectionProgress;
  progress: () => QrCollectionProgress;
  /** Discard everything collected so far, freeing the collector for a new session. */
  reset: () => void;
}

const EMPTY: QrCollectionProgress = {
  sessionId: null,
  received: 0,
  total: null,
  missing: [],
  text: null,
};

export const createQrPartCollector = (): QrPartCollector => {
  const parts = new Map<number, QrPart>();
  let sessionId: string | null = null;
  let total: number | null = null;

  const snapshot = (): QrCollectionProgress => {
    if (sessionId === null || total === null) return EMPTY;
    const missing = Array.from({ length: total }, (_unused, i) => i + 1).filter(
      (index) => !parts.has(index),
    );
    return {
      sessionId,
      received: parts.size,
      total,
      missing,
      text: missing.length === 0 ? joinQrParts([...parts.values()]) : null,
    };
  };

  return {
    accept: (symbol) => {
      const part = parseQrPart(symbol);
      if (sessionId !== null && part.sessionId !== sessionId) {
        throw new PairingError(
          PairingErrorCode.BadQrSequence,
          'symbol belongs to a different pairing session',
        );
      }
      sessionId = part.sessionId;
      total = part.total;
      parts.set(part.index, part);
      return snapshot();
    },
    progress: snapshot,
    reset: () => {
      parts.clear();
      sessionId = null;
      total = null;
    },
  };
};
