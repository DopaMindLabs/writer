import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserPeerConnection } from './browserPeerConnection';

/**
 * A stand-in for `RTCPeerConnection`, which jsdom does not provide. These tests
 * prove the narrowing at the boundary — that an absent `sdp` becomes an empty
 * string rather than `undefined` halfway through signing a payload, and that a
 * description type the browser cannot accept is refused rather than coerced.
 */

const created: FakePeerConnection[] = [];
let seenConfiguration: RTCConfiguration | undefined;

/**
 * A stand-in for `RTCPeerConnection`, which jsdom does not provide. It is the
 * one class in a file of arrows because `new` needs something constructible;
 * its members are arrow properties like everything else.
 */
class FakePeerConnection {
  iceGatheringState = 'gathering';
  connectionState = 'new';
  localDescription: RTCSessionDescriptionInit | null = null;
  remote: RTCSessionDescriptionInit | null = null;
  closed = false;
  channels: { label: string; options?: { ordered?: boolean } }[] = [];
  listeners: string[] = [];
  offer: RTCSessionDescriptionInit = { type: 'offer', sdp: 'v=0\r\nOFFER\r\n' };

  constructor(configuration: RTCConfiguration) {
    seenConfiguration = configuration;
    created.push(this);
  }

  createDataChannel = (label: string, options?: { ordered?: boolean }) => {
    this.channels.push({ label, options });
    return { close: () => undefined };
  };

  createOffer = () => Promise.resolve(this.offer);

  createAnswer = () => Promise.resolve({ type: 'answer', sdp: 'v=0\r\nANSWER\r\n' });

  setLocalDescription = (description: RTCSessionDescriptionInit) => {
    this.localDescription = description;
    return Promise.resolve();
  };

  setRemoteDescription = (description: RTCSessionDescriptionInit) => {
    this.remote = description;
    return Promise.resolve();
  };

  close = () => {
    this.closed = true;
  };

  addEventListener = (type: string) => {
    this.listeners.push(type);
  };

  removeEventListener = (type: string) => {
    this.listeners = this.listeners.filter((entry) => entry !== type);
  };
}

/** The connection the adapter most recently wrapped. */
const fake = (): FakePeerConnection => created[created.length - 1];

beforeEach(() => {
  created.length = 0;
  seenConfiguration = undefined;
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserPeerConnection', () => {
  it('contacts no STUN or TURN server', () => {
    createBrowserPeerConnection();

    expect(seenConfiguration).toEqual({ iceServers: [] });
  });

  it('reads the live gathering and connection state', () => {
    const connection = createBrowserPeerConnection();

    expect(connection.iceGatheringState).toBe('gathering');
    expect(connection.connectionState).toBe('new');

    fake().iceGatheringState = 'complete';
    fake().connectionState = 'connected';

    expect(connection.iceGatheringState).toBe('complete');
    expect(connection.connectionState).toBe('connected');
  });

  it('reports no local description as null rather than an empty one', () => {
    expect(createBrowserPeerConnection().localDescription).toBeNull();
  });

  it('narrows an absent sdp to an empty string', async () => {
    // A pairing payload must carry a complete description. The absence has to
    // show up here, not halfway through signing.
    const connection = createBrowserPeerConnection();
    fake().offer = { type: 'offer' };

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    expect(offer).toEqual({ type: 'offer', sdp: '' });
    expect(connection.localDescription).toEqual({ type: 'offer', sdp: '' });
  });

  it('passes an offer and an answer through unchanged', async () => {
    const connection = createBrowserPeerConnection();

    expect(await connection.createOffer()).toEqual({ type: 'offer', sdp: 'v=0\r\nOFFER\r\n' });
    expect(await connection.createAnswer()).toEqual({
      type: 'answer',
      sdp: 'v=0\r\nANSWER\r\n',
    });
  });

  it('applies the peer description', async () => {
    const connection = createBrowserPeerConnection();

    await connection.setRemoteDescription({ type: 'offer', sdp: 'v=0\r\nTHEIRS\r\n' });

    expect(fake().remote).toEqual({ type: 'offer', sdp: 'v=0\r\nTHEIRS\r\n' });
  });

  it('refuses a description type the browser cannot accept', () => {
    // The engine carries `type` as a plain string; anything outside WebRTC's
    // four is a bug rather than something to coerce.
    const connection = createBrowserPeerConnection();

    expect(() => connection.setRemoteDescription({ type: 'nonsense', sdp: 'v=0\r\n' })).toThrow(
      /unsupported session description type/,
    );
  });

  it('opens a data channel with the options it was given', () => {
    const connection = createBrowserPeerConnection();

    connection.createDataChannel('writer-sync-control', { ordered: true });

    expect(fake().channels).toEqual([
      { label: 'writer-sync-control', options: { ordered: true } },
    ]);
  });

  it('registers and removes listeners on the underlying connection', () => {
    const connection = createBrowserPeerConnection();
    const listener = () => undefined;

    connection.addEventListener('icegatheringstatechange', listener);
    expect(fake().listeners).toEqual(['icegatheringstatechange']);

    connection.removeEventListener('icegatheringstatechange', listener);
    expect(fake().listeners).toEqual([]);
  });

  it('closes the underlying connection', () => {
    const connection = createBrowserPeerConnection();

    connection.close();

    expect(fake().closed).toBe(true);
  });
});
