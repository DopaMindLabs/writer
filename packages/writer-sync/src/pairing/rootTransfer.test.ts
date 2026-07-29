import { describe, expect, it, vi } from 'vitest';
import { ROOT_TRANSFER_VERSION, type RootTransferMessage } from './rootTransferMessage';
import { startRootTransfer, type RootTransferPorts } from './rootTransfer';

/**
 * Handing an root secret to a device that has just been paired.
 *
 * The exchange is symmetric because the pairing roles say nothing about which
 * device has been used before: each announces whether it holds key material, and
 * the one that has it seals it for the one that does not.
 *
 * Announcements repeat until the peer has been heard, because a data channel
 * drops what arrives before anyone is listening and the two humans do not press
 * "the codes match" at the same instant.
 */

const wrapper = () => ({
  ephemeralPublicJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
  iv: 'aXY',
  wrapped: 'cm9vdA',
});

interface Harness {
  ports: RootTransferPorts;
  sent: RootTransferMessage[];
  accepted: unknown[];
  tick: () => void;
}

const harness = (options: {
  holdsRoot: boolean;
  mintsFirst?: boolean;
  onMint?: () => void;
}): Harness => {
  const sent: RootTransferMessage[] = [];
  const accepted: unknown[] = [];
  let held = options.holdsRoot;
  let pending: (() => void) | null = null;
  return {
    sent,
    accepted,
    tick: () => pending?.(),
    ports: {
      holdsRoot: () => held,
      mintsFirst: () => options.mintsFirst ?? false,
      createRoot: () => {
        held = true;
        options.onMint?.();
        return Promise.resolve();
      },
      wrapForPeer: () => Promise.resolve({ wrapper: wrapper(), epoch: 2 }),
      acceptWrapper: (received) => {
        accepted.push(received);
        return Promise.resolve();
      },
      send: (message) => sent.push(message),
      setTimer: (callback) => {
        pending = callback;
        return 1;
      },
      clearTimer: () => {
        pending = null;
      },
    },
  };
};

const READY = { v: ROOT_TRANSFER_VERSION, kind: 'ready' } as const;

/** What this device said, ignoring the "nothing further" it repeats at the end. */
const substance = (sent: readonly RootTransferMessage[]) =>
  sent.filter((message) => message.kind !== 'ready');

describe('startRootTransfer', () => {
  it('announces what this device holds as soon as it starts', () => {
    const withRoot = harness({ holdsRoot: true });
    const without = harness({ holdsRoot: false });

    startRootTransfer(withRoot.ports).start();
    startRootTransfer(without.ports).start();

    expect(withRoot.sent).toEqual([{ v: ROOT_TRANSFER_VERSION, kind: 'holds-root' }]);
    expect(without.sent).toEqual([{ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' }]);
  });

  it('repeats its announcement until the peer has been heard', () => {
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    device.tick();
    device.tick();
    expect(device.sent).toHaveLength(3);

    void transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'holds-root' });

    // Both know where they stand, so what it repeats now is that it has
    // finished — until the peer says the same.
    expect(device.sent.at(-1)).toEqual(READY);
  });

  it('seals the root for a peer that says it needs one', async () => {
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' });

    expect(substance(device.sent).at(-1)).toEqual({
      v: ROOT_TRANSFER_VERSION,
      kind: 'root',
      wrapper: wrapper(),
      epoch: 2,
    });

    await transfer.receive(READY);
    await expect(transfer.settled()).resolves.toBe('sent');
  });

  it('answers a request that arrived before this device was ready', async () => {
    // The peer confirmed first and announced into a channel nobody was reading
    // yet — its repeat is what this device hears, and it must still be answered.
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' });
    transfer.start();

    await vi.waitFor(() => {
      expect(substance(device.sent).at(-1)?.kind).toBe('root');
    });
  });

  it('installs a root that arrives, once', async () => {
    const device = harness({ holdsRoot: false });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    const sealed = { v: ROOT_TRANSFER_VERSION, kind: 'root', wrapper: wrapper(), epoch: 2 } as const;
    await transfer.receive(sealed);
    await transfer.receive(sealed);

    expect(device.accepted).toEqual([{ wrapper: wrapper(), epoch: 2 }]);

    await transfer.receive(READY);
    await expect(transfer.settled()).resolves.toBe('received');
  });

  it('refuses a root it did not ask for', async () => {
    // This device already holds key material. Accepting a second root would
    // replace what every local row is sealed under.
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    await transfer.receive({
      v: ROOT_TRANSFER_VERSION,
      kind: 'root',
      wrapper: wrapper(),
      epoch: 2,
    });

    expect(device.accepted).toEqual([]);
  });

  it('settles with nothing to do when both devices hold a root', async () => {
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'holds-root' });
    await transfer.receive(READY);

    await expect(transfer.settled()).resolves.toBe('not-needed');
  });

  it('waits for the peer before handing the channel on', async () => {
    // Sync follows on this channel with a decoder of its own. A device that
    // returned to sync while its peer was still reading for keys would have its
    // first message swallowed and never repeated — which is exactly how a
    // pairing ends up connected, trusted and silent.
    const device = harness({ holdsRoot: true });
    const transfer = startRootTransfer(device.ports);
    transfer.start();
    let handedOn = false;
    void transfer.settled().then(() => {
      handedOn = true;
    });

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'holds-root' });
    await Promise.resolve();

    expect(handedOn).toBe(false);
    expect(device.sent.at(-1)).toEqual(READY);

    await transfer.receive(READY);
    await expect(transfer.settled()).resolves.toBe('not-needed');
  });

  it('mints a root when neither device has one and this is the device to do it', async () => {
    // Two devices that have never been used cannot wait for each other. One of
    // them has to mint the root secret, and both already know which — the ids
    // they exchanged say so, with no further round trip.
    const minted = vi.fn();
    const device = harness({ holdsRoot: false, mintsFirst: true, onMint: minted });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' });

    expect(minted).toHaveBeenCalledTimes(1);
    expect(substance(device.sent).at(-1)?.kind).toBe('root');

    await transfer.receive(READY);
    await expect(transfer.settled()).resolves.toBe('sent');
  });

  it('waits for the other device to mint when it is not the one to do it', async () => {
    const minted = vi.fn();
    const device = harness({ holdsRoot: false, mintsFirst: false, onMint: minted });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    await transfer.receive({ v: ROOT_TRANSFER_VERSION, kind: 'needs-root' });

    expect(minted).not.toHaveBeenCalled();
    // Still announcing: the peer is about to mint and send.
    expect(device.sent.every((message) => message.kind === 'needs-root')).toBe(true);
  });

  it('stops announcing when it is stopped', () => {
    const device = harness({ holdsRoot: false });
    const transfer = startRootTransfer(device.ports);
    transfer.start();

    transfer.stop();
    device.tick();

    expect(device.sent).toHaveLength(1);
  });
});
