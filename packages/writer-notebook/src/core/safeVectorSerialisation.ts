import { DEFAULT_SAFE_VECTOR_LIMITS, type SafeVectorLimits } from './limits';
import type { SafeVectorDocumentV1 } from './safeVector.types';
import { parseSafeVectorDocument } from './safeVectorValidation';

export const SAFE_VECTOR_DOCUMENT_MIME = 'application/vnd.dopamind.writer-notebook-vector+json';

const pathElement = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;

export const serialiseSafeVectorDocument = (document: SafeVectorDocumentV1): Blob => {
  const safe = parseSafeVectorDocument(document);
  return new Blob([JSON.stringify(safe)], { type: SAFE_VECTOR_DOCUMENT_MIME });
};

export const parseSafeVectorBlob = async (
  blob: Blob,
  overrides?: Partial<SafeVectorLimits>,
): Promise<SafeVectorDocumentV1> => {
  if (blob.type !== SAFE_VECTOR_DOCUMENT_MIME) {
    throw new TypeError('Safe-vector asset MIME is not supported');
  }
  const maxBytes = overrides?.maxBytes ?? DEFAULT_SAFE_VECTOR_LIMITS.maxBytes;
  if (blob.size <= 0 || blob.size > maxBytes) {
    throw new RangeError('Safe-vector asset exceeds the byte limit');
  }
  const parsed: unknown = JSON.parse(await blob.text());
  return parseSafeVectorDocument(parsed, overrides);
};

export const serialiseSafeVectorSvg = (document: SafeVectorDocumentV1): Blob => {
  const safe = parseSafeVectorDocument(document);
  const paths = safe.paths.map(({ d, fill }) => pathElement(d, fill)).join('');
  const width = safe.width.toString();
  const height = safe.height.toString();
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg"',
    ` width="${width}" height="${height}"`,
    ` viewBox="0 0 ${width} ${height}" role="img">`,
    paths,
    '</svg>',
  ].join('');
  return new Blob([svg], { type: 'image/svg+xml' });
};
