import type { SafeVectorDocumentV1 } from './safeVector.types';
import { parseSafeVectorDocument } from './safeVectorValidation';

const pathElement = (d: string, fill: string): string => `<path d="${d}" fill="${fill}"/>`;

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
