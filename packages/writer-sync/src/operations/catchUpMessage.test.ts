import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '../core/ids';
import type { EncryptedSyncFrame } from './operation.types';
import {
  CATCH_UP_PROTOCOL_VERSION,
  MAX_FRAMES_PER_MESSAGE,
  MAX_MANIFESTS,
  MalformedCatchUpMessageError,
  decodeCatchUpMessage,
  encodeCatchUpMessage,
  type CatchUpMessage,
} from './catchUpMessage';

const frame: EncryptedSyncFrame = {
  v: 1,
  operationId: asOperationId('op-1'),
  accessScopeId: 'scope-1',
  entityTable: 'notes',
  entityId: 'note-1',
  kind: 'put',
  deviceId: asDeviceId('device-a'),
  logicalAt: { millis: 10, counter: 0 },
  keyId: 'key-1',
  epoch: 1,
  payloadHash: 'hash',
  payload: 'cGF5bG9hZA',
  signature: '',
};

const roundTrip = (message: CatchUpMessage): CatchUpMessage =>
  decodeCatchUpMessage(encodeCatchUpMessage(message));

const bytesOf = (value: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(value));

describe('catch-up message round trip', () => {
  it('carries a manifest', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'manifest',
      manifests: [
        {
          accessScopeId: 'scope-1',
          origins: [
            {
              originDeviceId: asDeviceId('device-a'),
              highWaterMark: asOperationId('op-1'),
              logicalAt: { millis: 10, counter: 0 },
              count: 3,
            },
          ],
        },
      ],
    };

    expect(roundTrip(message)).toEqual(message);
  });

  it('carries a request, with and without a starting point', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'request',
      requests: [
        {
          accessScopeId: 'scope-1',
          originDeviceId: asDeviceId('device-a'),
          after: { millis: 10, counter: 2 },
        },
        { accessScopeId: 'scope-2', originDeviceId: asDeviceId('device-b') },
      ],
    };

    expect(roundTrip(message)).toEqual({
      ...message,
      requests: [message.requests[0], { ...message.requests[1], after: undefined }],
    });
  });

  it('carries frames and the final marker', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'frames',
      frames: [frame],
      final: true,
    };

    expect(roundTrip(message)).toEqual(message);
  });

  it('carries acknowledgements', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'ack',
      acknowledgements: [
        {
          accessScopeId: 'scope-1',
          originDeviceId: asDeviceId('device-a'),
          operationId: asOperationId('op-1'),
        },
      ],
    };

    expect(roundTrip(message)).toEqual(message);
  });
});

const attachmentManifest = {
  attachmentId: 'att-1',
  contentHash: 'Y29udGVudA',
  totalBytes: 20,
  chunkBytes: 8,
  chunkCount: 3,
  chunkHashes: ['aA', 'bB', 'cC'],
};

describe('attachment message round trip', () => {
  it('carries an offer', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'attachment-offer',
      cursor: 0,
      manifests: [attachmentManifest],
    };

    expect(roundTrip(message)).toEqual(message);
  });

  it('carries a chunk request', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'attachment-request',
      attachmentId: 'att-1',
      indices: [0, 2],
    };

    expect(roundTrip(message)).toEqual(message);
  });

  it('carries a chunk', () => {
    const message: CatchUpMessage = {
      v: CATCH_UP_PROTOCOL_VERSION,
      kind: 'attachment-chunk',
      chunk: { attachmentId: 'att-1', index: 1, bytes: 'AAEC' },
    };

    expect(roundTrip(message)).toEqual(message);
  });
});

describe('decodeCatchUpMessage rejects an attachment manifest', () => {
  const offerOf = (manifest: Record<string, unknown>) =>
    bytesOf({ v: 1, kind: 'attachment-offer', cursor: 0, manifests: [manifest] });

  it('whose chunk count disagrees with its hashes', () => {
    expect(() =>
      decodeCatchUpMessage(offerOf({ ...attachmentManifest, chunkHashes: ['aA'] })),
    ).toThrow(/chunkCount disagrees with chunkHashes/);
  });

  it('whose chunk count disagrees with its declared size', () => {
    expect(() =>
      decodeCatchUpMessage(offerOf({ ...attachmentManifest, totalBytes: 100 })),
    ).toThrow(/chunkCount disagrees with the declared size/);
  });

  it('that claims more than the size ceiling', () => {
    expect(() =>
      decodeCatchUpMessage(
        offerOf({
          ...attachmentManifest,
          totalBytes: 1_073_741_824,
          chunkBytes: 1_048_576,
          chunkCount: 1024,
          chunkHashes: Array.from({ length: 1024 }, () => 'aA'),
        }),
      ),
    ).toThrow(/totalBytes exceeds the ceiling/);
  });

  it('with a non-integer chunk index in a request', () => {
    expect(() =>
      decodeCatchUpMessage(
        bytesOf({ v: 1, kind: 'attachment-request', attachmentId: 'a', indices: [1.5] }),
      ),
    ).toThrow(/indices\[0\] must be a non-negative integer/);
  });
});

describe('decodeCatchUpMessage rejects', () => {
  it('bytes that are not JSON', () => {
    expect(() => decodeCatchUpMessage(new TextEncoder().encode('{'))).toThrow(
      MalformedCatchUpMessageError,
    );
  });

  it('a message that is not an object', () => {
    expect(() => decodeCatchUpMessage(bytesOf([1, 2, 3]))).toThrow(
      MalformedCatchUpMessageError,
    );
  });

  it('an unsupported protocol version', () => {
    expect(() => decodeCatchUpMessage(bytesOf({ v: 99, kind: 'ack' }))).toThrow(
      /unsupported protocol version 99/,
    );
  });

  it('an unknown kind', () => {
    expect(() => decodeCatchUpMessage(bytesOf({ v: 1, kind: 'nonsense' }))).toThrow(
      /unsupported kind nonsense/,
    );
  });

  it('a manifest whose origins are not an array', () => {
    expect(() =>
      decodeCatchUpMessage(
        bytesOf({ v: 1, kind: 'manifest', manifests: [{ accessScopeId: 's', origins: 4 }] }),
      ),
    ).toThrow(/origins must be an array/);
  });

  it('a manifest with a negative count', () => {
    expect(() =>
      decodeCatchUpMessage(
        bytesOf({
          v: 1,
          kind: 'manifest',
          manifests: [
            {
              accessScopeId: 's',
              origins: [
                {
                  originDeviceId: 'd',
                  highWaterMark: 'o',
                  logicalAt: { millis: 1, counter: 0 },
                  count: -1,
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/count must be a non-negative integer/);
  });

  it('an acknowledgement missing its scope', () => {
    expect(() =>
      decodeCatchUpMessage(
        bytesOf({
          v: 1,
          kind: 'ack',
          acknowledgements: [{ originDeviceId: 'd', operationId: 'o' }],
        }),
      ),
    ).toThrow(/accessScopeId must be a non-empty string/);
  });

  it('a frame that is malformed', () => {
    expect(() =>
      decodeCatchUpMessage(bytesOf({ v: 1, kind: 'frames', frames: [{ v: 1 }] })),
    ).toThrow();
  });
});

describe('decodeCatchUpMessage bounds a flooding peer', () => {
  it('refuses more manifests than the ceiling', () => {
    const manifests = Array.from({ length: MAX_MANIFESTS + 1 }, () => ({
      accessScopeId: 'scope-1',
      origins: [],
    }));

    expect(() =>
      decodeCatchUpMessage(bytesOf({ v: 1, kind: 'manifest', manifests })),
    ).toThrow(/manifests exceeds 256 entries/);
  });

  it('refuses more frames than the ceiling', () => {
    const frames = Array.from({ length: MAX_FRAMES_PER_MESSAGE + 1 }, () => frame);

    expect(() => decodeCatchUpMessage(bytesOf({ v: 1, kind: 'frames', frames }))).toThrow(
      /frames exceeds 64 entries/,
    );
  });

  it('treats a missing final marker as not final', () => {
    const message = decodeCatchUpMessage(bytesOf({ v: 1, kind: 'frames', frames: [] }));

    expect(message).toEqual({ v: 1, kind: 'frames', frames: [], final: false });
  });
});
