import { describe, expect, it } from 'vitest';
import {
  parseSafeVectorBlob,
  parseSafeVectorDocument,
  SAFE_VECTOR_DOCUMENT_MIME,
  serialiseSafeVectorDocument,
  serialiseSafeVectorSvg,
} from '../src/core/index';

describe('safe vector SVG serialisation', () => {
  it('serialises only the validated path model to an image blob', async () => {
    const document = parseSafeVectorDocument({
      version: 1,
      width: 200,
      height: 100,
      paths: [{ d: 'M0 0 L10 10 Z', fill: '#123456' }],
    });

    const blob = serialiseSafeVectorSvg(document);
    const svg = await blob.text();

    expect(blob.type).toBe('image/svg+xml');
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).toContain('<path d="M0 0 L10 10 Z" fill="#123456"/>');
    expect(svg).not.toContain('<script');
    expect(svg).not.toContain('foreignObject');
  });

  it('round-trips the durable vector asset as validated JSON rather than SVG markup', async () => {
    const document = parseSafeVectorDocument({
      version: 1,
      width: 200,
      height: 100,
      paths: [{ d: 'M0 0 L10 10 Z', fill: '#123456' }],
    });

    const blob = serialiseSafeVectorDocument(document);

    expect(blob.type).toBe(SAFE_VECTOR_DOCUMENT_MIME);
    await expect(parseSafeVectorBlob(blob)).resolves.toEqual(document);
  });

  it('rejects a vector blob with the wrong MIME before parsing it', async () => {
    const blob = new Blob(['{}'], { type: 'image/svg+xml' });

    await expect(parseSafeVectorBlob(blob)).rejects.toThrow('MIME');
  });
});
