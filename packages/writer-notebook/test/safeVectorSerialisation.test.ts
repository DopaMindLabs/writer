import { describe, expect, it } from 'vitest';
import { parseSafeVectorDocument, serialiseSafeVectorSvg } from '../src/core/index';

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
});
