import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';
import { getPdfMarkLabel, type MarkTranslate } from './pdfMarkLabel';
import type { AnnotatorAnnotation } from '@/pdf-annotator/core/types';

const t: MarkTranslate = i18n.getFixedT('en', 'screens');

const annotation = (overrides: Partial<AnnotatorAnnotation> = {}): AnnotatorAnnotation => ({
  id: 'h1',
  kind: 'highlight',
  page: 1,
  rects: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
  quote: 'Lorem ipsum highlights beautifully.',
  color: 'pink',
  createdAt: 1,
  ...overrides,
});

describe('getPdfMarkLabel', () => {
  it('builds the accessible name from the colour and quote', () => {
    expect(getPdfMarkLabel(t, annotation())).toBe(
      'Highlight, Pink: Lorem ipsum highlights beautifully.',
    );
  });

  it('truncates a long quote in the accessible name to 80 characters', () => {
    const long = 'x'.repeat(200);
    const name = getPdfMarkLabel(t, annotation({ quote: long }));
    expect(name).toContain('x'.repeat(80));
    expect(name).not.toContain('x'.repeat(81));
  });
});
