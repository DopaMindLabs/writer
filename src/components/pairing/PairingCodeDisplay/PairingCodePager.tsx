import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

/**
 * Paging between the symbols of a multi-part pairing code.
 *
 * The parts are stepped through by hand rather than cycled on a timer: a timer
 * would have to be gated on `prefers-reduced-motion`, and it takes the pace away
 * from the person holding the other device, who is the only one who knows when a
 * symbol has been read.
 */

export interface PairingCodePagerProps {
  /** Zero-based index of the symbol on screen. */
  index: number;
  total: number;
  onChange: (index: number) => void;
}

export const PairingCodePager = ({ index, total, onChange }: PairingCodePagerProps) => {
  const { t } = useTranslation('screens');

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        kind="secondary"
        size="sm"
        disabled={index === 0}
        onClick={() => {
          onChange(index - 1);
        }}
      >
        {t('settings.pairing.previousSymbol')}
      </Button>
      <p role="status" aria-live="polite" className="text-caption text-ink-2">
        {t('settings.pairing.symbolPosition', { index: index + 1, total })}
      </p>
      <Button
        kind="secondary"
        size="sm"
        disabled={index >= total - 1}
        onClick={() => {
          onChange(index + 1);
        }}
      >
        {t('settings.pairing.nextSymbol')}
      </Button>
    </div>
  );
};
