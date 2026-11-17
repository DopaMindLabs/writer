import { isCatchUpMessageKind } from '../../operations/catchUpMessage';
import { isRootTransferMessageKind } from '../../pairing/rootTransferMessage';
import { filterChannelByKind } from './filterChannelByKind';
import type { DataChannelLike } from './webRtcTransport';

/**
 * Split one pairing channel into the two protocols that share it.
 *
 * A confirmed pairing carries key material and then syncs, over a single channel,
 * with a decoder for each. Both protocols are read from the moment the channel
 * opens rather than in turn, because neither device can know when its peer has
 * moved on: a device whose wait for key material times out first starts syncing
 * while its peer is still listening for keys, and a manifest is sent once and
 * never repeated — one refusal used to cost the whole exchange.
 *
 * Each view is built by exclusion, not inclusion: it withholds only what
 * certainly belongs to the other protocol. So a kind neither protocol knows, and
 * bytes that are not a message at all, still reach both decoders and are refused
 * out loud by each. Routing is not a place to make validation quieter — the
 * refusals are what the threat model depends on.
 */

export type PairingChannelProtocol = 'root-transfer' | 'catch-up';

export interface SplitPairingChannelOptions {
  channel: DataChannelLike;
  /**
   * Told which protocol was holding too much, the first time a peer sends more
   * than a view will keep for a consumer that has not started reading yet.
   */
  onOverflow?: (protocol: PairingChannelProtocol) => void;
}

export interface PairingChannelViews {
  /** Carries what two confirmed devices say about key material. */
  rootTransfer: DataChannelLike;
  /** Carries the catch-up exchange, holding anything that arrives early. */
  catchUp: DataChannelLike;
}

export const splitPairingChannel = (
  options: SplitPairingChannelOptions,
): PairingChannelViews => {
  const { channel, onOverflow } = options;
  return {
    rootTransfer: filterChannelByKind({
      channel,
      accepts: (kind) => kind === undefined || !isCatchUpMessageKind(kind),
      onOverflow: () => {
        onOverflow?.('root-transfer');
      },
    }),
    catchUp: filterChannelByKind({
      channel,
      accepts: (kind) => kind === undefined || !isRootTransferMessageKind(kind),
      onOverflow: () => {
        onOverflow?.('catch-up');
      },
    }),
  };
};
