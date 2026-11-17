/**
 * Waiting for a channel to have room, rather than queueing in front of it.
 *
 * The outbox exists for senders that cannot wait: a frame is written the moment
 * a row is journalled, and there may be no channel yet. A sender that knows how
 * much it has to say — attachment chunks, page after page — should instead let
 * the bearer set the pace, or it will discover the outbox bound as a failure
 * partway through something that was never too large, only too fast.
 *
 * Waiters are woken in the order they asked, and woken *whatever* changed: a
 * channel that has gone away has no room and never will, so a sender parked on
 * it has to be released to find that out rather than left forever.
 */
export interface RoomGate {
  /** Resolves when there is room to write, or when there never will be. */
  whenReady: () => Promise<void>;
  /** Room changed, or the channel did. Release whoever can now proceed. */
  wake: () => void;
}

export const createRoomGate = (settled: () => boolean): RoomGate => {
  const waiting: (() => void)[] = [];

  return {
    whenReady: () =>
      settled()
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiting.push(resolve);
          }),
    wake: () => {
      while (waiting.length > 0 && settled()) waiting.shift()?.();
    },
  };
};
