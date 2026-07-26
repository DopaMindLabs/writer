import { encode } from 'uqr';

/**
 * The generation port: payload text in, module matrix or SVG geometry out.
 * Rendering (colour, theming, labelling) belongs to the application — the
 * facade returns data only, and the SVG path is drawn for `currentColor` so no
 * colour is ever baked in here.
 */

/** Error-correction level, in increasing redundancy order. */
export type QrEccLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrEncodeOptions {
  ecc?: QrEccLevel;
  /** Quiet-zone width in modules around the symbol. */
  border?: number;
}

export interface QrMatrix {
  /** QR symbol version, 1–40. */
  version: number;
  /** Edge length in modules, border included. */
  size: number;
  /** The quiet-zone width the matrix was built with. */
  border: number;
  /** `true` is a dark module. Row-major, `size` × `size`. */
  modules: boolean[][];
}

export interface QrSvgGeometry {
  /** Square viewBox in module units, border included. */
  viewBox: string;
  /** One `h1v1` square per dark module, for a path filled with `currentColor`. */
  path: string;
}

export class QrEncodingError extends Error {
  constructor(reason: string) {
    super(`QR encoding failed: ${reason}`);
    this.name = 'QrEncodingError';
  }
}

/** Byte-mode capacity of the largest symbol (version 40) at ECC level `L`. */
export const QR_MAX_TEXT_CHARS = 2953;

const DEFAULT_BORDER = 2;

/** Encode text into a boolean module matrix. */
export const encodeQrMatrix = (
  text: string,
  options: QrEncodeOptions = {},
): QrMatrix => {
  if (text.length === 0) throw new QrEncodingError('text must not be empty');
  if (text.length > QR_MAX_TEXT_CHARS) {
    throw new QrEncodingError(
      `text exceeds the ${String(QR_MAX_TEXT_CHARS)}-character symbol capacity`,
    );
  }
  const border = options.border ?? DEFAULT_BORDER;
  const encoded = encode(text, { ecc: options.ecc ?? 'M', border });
  return {
    version: encoded.version,
    size: encoded.size,
    border,
    modules: encoded.data.map((row) => [...row]),
  };
};

/** Encode text into path geometry for an SVG drawn with `currentColor`. */
export const encodeQrSvg = (
  text: string,
  options: QrEncodeOptions = {},
): QrSvgGeometry => {
  const matrix = encodeQrMatrix(text, options);
  const squares: string[] = [];
  matrix.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) squares.push(`M${String(x)} ${String(y)}h1v1h-1z`);
    });
  });
  const edge = String(matrix.size);
  return {
    viewBox: `0 0 ${edge} ${edge}`,
    path: squares.join(''),
  };
};
