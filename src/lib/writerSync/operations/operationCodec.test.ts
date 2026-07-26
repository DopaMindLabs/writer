import { describe, expect, it } from 'vitest';
import { asDeviceId, asOperationId } from '@/lib/syncProviders/ids';
import type { EncryptedSyncFrame } from './operation.types';
import {
  FramePayloadMismatchError,
  MalformedFrameError,
  WrongScopeFrameError,
  decodeFrame,
  hashPayload,
  verifyFrame,
} from './operationCodec';

const frame = async (
  overrides: Partial<EncryptedSyncFrame> = {},
): Promise<EncryptedSyncFrame> => {
  const payload = overrides.payload ?? btoa('ciphertext');
  return {
    v: 1,
    operationId: asOperationId('op-1'),
    accessScopeId: 's1',
    entityTable: 'notes',
    entityId: 'n1',
    kind: 'put',
    deviceId: asDeviceId('dev-1'),
    logicalAt: { millis: 1000, counter: 0 },
    keyId: 'key-1',
    epoch: 1,
    payload,
    payloadHash: await hashPayload(payload),
    signature: '',
    ...overrides,
  };
};

describe('decodeFrame', () => {
  it('round-trips a valid frame through JSON', async () => {
    const original = await frame();
    expect(decodeFrame(JSON.parse(JSON.stringify(original)))).toEqual(original);
  });

  it.each([
    ['not an object', 'frame must be an object'],
    [{ v: 99 }, 'unsupported protocol version'],
  ])('rejects %j', (value, message) => {
    expect(() => decodeFrame(value)).toThrow(
      new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });

  it('rejects a frame missing a header field', async () => {
    const { entityId, ...rest } = await frame();
    void entityId;
    expect(() => decodeFrame(rest)).toThrow(MalformedFrameError);
  });

  it('rejects an empty operation id or scope', async () => {
    const valid = await frame();
    expect(() => decodeFrame({ ...valid, operationId: '' })).toThrow(MalformedFrameError);
    expect(() => decodeFrame({ ...valid, accessScopeId: '' })).toThrow(MalformedFrameError);
  });

  it('rejects an unknown kind and a payload-less put', async () => {
    const valid = await frame();
    expect(() => decodeFrame({ ...valid, kind: 'merge' })).toThrow(MalformedFrameError);
    expect(() => decodeFrame({ ...valid, payload: '' })).toThrow(MalformedFrameError);
  });

  it('accepts a payload-less delete', async () => {
    const deletion = await frame({ kind: 'delete', payload: '' });
    deletion.payloadHash = await hashPayload('');
    expect(decodeFrame(JSON.parse(JSON.stringify(deletion))).kind).toBe('delete');
  });
});

describe('verifyFrame', () => {
  it('accepts a frame whose payload matches its hash', async () => {
    const valid = await frame();
    await expect(verifyFrame(valid)).resolves.toEqual(valid);
  });

  it('rejects a frame whose payload was tampered with', async () => {
    const tampered = { ...(await frame()), payload: btoa('other-bytes') };
    await expect(verifyFrame(tampered)).rejects.toBeInstanceOf(FramePayloadMismatchError);
  });

  it('rejects a frame for a different scope than expected', async () => {
    const valid = await frame();
    await expect(
      verifyFrame(valid, { expectedScope: 'someone-elses-scope' }),
    ).rejects.toBeInstanceOf(WrongScopeFrameError);
  });

  it('accepts the expected scope', async () => {
    const valid = await frame();
    await expect(verifyFrame(valid, { expectedScope: 's1' })).resolves.toBeDefined();
  });
});
