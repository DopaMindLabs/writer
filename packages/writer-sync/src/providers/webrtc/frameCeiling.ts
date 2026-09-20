/**
 * The largest message this transport will carry, and the point at which it
 * stops writing into the channel's own buffer.
 *
 * Kept apart from the transport so the queue in front of the channel can derive
 * its bounds from the same numbers without depending on the transport itself.
 */

/** Above this, a peer is flooding rather than syncing (threat model §5.13). */
export const MAX_FRAME_BYTES = 262_144;

/** Stop writing once this much is queued; resume on `bufferedamountlow`. */
export const BUFFER_HIGH_WATER_BYTES = 1_048_576;

/** A frame the protocol may not send: the caller must chunk it instead. */
export class FrameTooLargeError extends Error {
  constructor(size: number) {
    super(`Frame of ${String(size)} bytes exceeds the ${String(MAX_FRAME_BYTES)} byte limit`);
    this.name = 'FrameTooLargeError';
  }
}
