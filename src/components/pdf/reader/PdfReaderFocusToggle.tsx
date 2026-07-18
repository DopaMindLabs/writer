import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Maximize2, Minimize2 } from '@/components/libs/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';

/**
 * The reader's focus toggle: always present in the topbar's trailing slot, it
 * flips `?focus=1` on the current media route. Focus mode hides the surrounding
 * chrome (space rail, thumbnails, side panels) so the page owns the room; the
 * toggle itself stays visible so focus is always reversible from the same spot.
 * A link, not a button, because it is a navigation to the same route with the
 * flag toggled — so a reload holds the focused state.
 */
export const PdfReaderFocusToggle = () => {
  const { t } = useTranslation('screens');
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const focused = searchParams.get('focus') === '1';

  const next = new URLSearchParams(searchParams);
  if (focused) next.delete('focus');
  else next.set('focus', '1');
  const qs = next.toString();
  const to = `${location.pathname}${qs ? `?${qs}` : ''}`;

  const label = focused ? t('pdfReader.focus.exit') : t('pdfReader.focus.enter');
  const Icon = focused ? Minimize2 : Maximize2;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          data-testid="pdf-focus-toggle"
          aria-label={label}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
};
