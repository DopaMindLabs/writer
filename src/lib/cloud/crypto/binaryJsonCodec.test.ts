import { describe, it, expect } from 'vitest';
import {
  tagBinary,
  untagBinary,
  MalformedBinaryTagError,
} from './binaryJsonCodec';

/** Round-trip a value through the JSON codec exactly as the envelope does. */
const roundTrip = async (value: unknown): Promise<unknown> =>
  untagBinary(JSON.parse(JSON.stringify(await tagBinary(value))));

const bytesOf = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer());

describe('binaryJsonCodec', () => {
  it('round-trips nested Uint8Array values byte-for-byte', async () => {
    const value = {
      a: { b: new Uint8Array([0, 1, 254, 255]) },
      list: [new Uint8Array([9, 8, 7]), 'plain'],
    };
    const back = (await roundTrip(value)) as typeof value;
    expect(Array.from(back.a.b)).toEqual([0, 1, 254, 255]);
    expect(Array.from(back.list[0] as Uint8Array)).toEqual([9, 8, 7]);
    expect(back.list[1]).toBe('plain');
  });

  it('round-trips a Blob preserving MIME type and bytes', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/png' });
    const back = (await roundTrip({ file: blob })) as { file: Blob };
    expect(back.file).toBeInstanceOf(Blob);
    expect(back.file.type).toBe('image/png');
    expect(Array.from(await bytesOf(back.file))).toEqual([1, 2, 3, 4, 5]);
  });

  it('round-trips a 5 MiB Blob without overflowing the argument stack', async () => {
    const raw = new Uint8Array(5 * 1024 * 1024);
    for (let i = 0; i < raw.length; i += 1) raw[i] = i % 256;
    const back = (await roundTrip(new Blob([raw], { type: 'application/octet-stream' }))) as Blob;
    const out = await bytesOf(back);
    expect(out.length).toBe(raw.length);
    // Spot-check across the payload rather than comparing 5M elements one by one.
    expect(out[0]).toBe(raw[0]);
    expect(out[2_500_000]).toBe(raw[2_500_000]);
    expect(out[out.length - 1]).toBe(raw[raw.length - 1]);
  });

  it('encodes binary as compact base64, not a number array', async () => {
    const tagged = (await tagBinary(new Uint8Array([1, 2, 3]))) as Record<string, unknown>;
    expect(typeof tagged.__u8b64).toBe('string');
    // The removed number-array representation is gone.
    expect('__u8' in tagged).toBe(false);
  });

  it('rejects a malformed Uint8Array tag before allocating', () => {
    expect(() => untagBinary({ __u8b64: 123 })).toThrow(MalformedBinaryTagError);
  });

  it('rejects a malformed Blob tag before allocating', () => {
    expect(() => untagBinary({ __blob: { type: 'image/png', base64: 5 } })).toThrow(
      MalformedBinaryTagError,
    );
  });

  it('rejects a function value', async () => {
    await expect(tagBinary({ fn: () => undefined })).rejects.toThrow(/function/);
  });
});
