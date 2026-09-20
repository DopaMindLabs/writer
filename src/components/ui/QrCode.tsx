import { useMemo, type SVGAttributes } from 'react';
import { encodeQrSvg, type QrEccLevel } from 'writer-qr/encode';
import { cn } from '@/lib/utils';

/**
 * A QR symbol, rendered from geometry rather than an image.
 *
 * The encoder returns a path and a viewBox and nothing else — no colour, no
 * size — so the symbol inherits `currentColor` and scales with its container.
 * That is what keeps it correct in the high-contrast themes without a second
 * code path: a baked-in black-on-white bitmap would be unreadable in one theme
 * and wrong in another.
 *
 * `label` is required rather than optional. A QR symbol is meaningless to a
 * screen reader, so the caller has to say what this one is *for* — and because
 * the caller supplies it, this primitive stays free of translated strings.
 */

export interface QrCodeProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** The exact text a scanner should read back. */
  value: string;
  /** Accessible name, e.g. "Pairing offer code". */
  label: string;
  /** Higher correction survives damage at the cost of a denser symbol. */
  ecc?: QrEccLevel;
  /** Shown instead of the symbol when `value` cannot be encoded. */
  unencodableLabel?: string;
}

export const QrCode = ({
  value,
  label,
  ecc = 'L',
  unencodableLabel = 'This code is too large to display.',
  className,
  ...rest
}: QrCodeProps) => {
  // Encoding is pure and deterministic, so it is safe to memoise on the payload
  // — and worth it, since a symbol of this size is thousands of path segments.
  const geometry = useMemo(() => {
    try {
      return encodeQrSvg(value, { ecc });
    } catch {
      return null;
    }
  }, [value, ecc]);

  if (geometry === null) {
    return (
      <p role="status" className={cn('text-caption text-ink-3', className)}>
        {unencodableLabel}
      </p>
    );
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={geometry.viewBox}
      // `shapeRendering` matters here: a scanner reads edges, and anti-aliased
      // module boundaries are what make a dense symbol fail to decode.
      shapeRendering="crispEdges"
      className={cn('h-auto w-full max-w-full', className)}
      {...rest}
    >
      <path d={geometry.path} fill="currentColor" />
    </svg>
  );
};
