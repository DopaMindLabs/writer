import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from '@/components/libs/icons';
import { useUI, type ReadingWidth, type Theme } from '@/store/ui';
import { Chip } from '@/components/ui/Chip';
import { PillToggle } from '@/components/ui/PillToggle';
import { ComingSoon } from '@/components/settings/ComingSoon';
import { PopoverClose } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/components/ui/Link';
import { TOUR_IDS, TOURS, type TourId } from '@/tours/tours';
import { useTour } from '@/tours/useTour';
import { getCompleted } from '@/tours/storage';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

const THEMES: { id: Theme; labelKey: string; titleKey: string }[] = [
  { id: 'light', labelKey: 'quickSettings.themes.light', titleKey: 'topbar.themes.light' },
  { id: 'dark', labelKey: 'quickSettings.themes.dark', titleKey: 'topbar.themes.dark' },
  { id: 'hc-light', labelKey: 'quickSettings.themes.hcLight', titleKey: 'topbar.themes.hcLight' },
  { id: 'hc-dark', labelKey: 'quickSettings.themes.hcDark', titleKey: 'topbar.themes.hcDark' },
];

interface RowProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

const Row = ({ label, hint, children }: RowProps) => {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-3 border-b border-rule/60 px-4 py-2.5">
      <div className="min-w-0 pt-px">
        <div className="text-[12px] font-medium text-ink">{label}</div>
        {hint && (
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
            {hint}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end">{children}</div>
    </div>
  );
};

const MenuItem = ({
  children,
  kbd,
  onClick,
  asChild,
  href,
  done,
}: {
  children: ReactNode;
  kbd?: string;
  onClick?: () => void;
  asChild?: boolean;
  href?: string;
  done?: boolean;
}) => {
  const inner = (
    <span className="flex w-full items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2 hover:bg-paper-2">
      {typeof done === 'boolean' && (
        <Check
          className={cn(
            'h-3 w-3 shrink-0',
            done ? 'text-ink opacity-100' : 'opacity-0',
          )}
          aria-hidden
        />
      )}
      <span className="flex-1 text-left">{children}</span>
      {kbd && (
        <span className="font-mono text-[10px] text-ink-4">{kbd}</span>
      )}
    </span>
  );
  if (asChild && href) {
    return (
      <PopoverClose asChild>
        <Link to={href} className="block w-full text-left">
          {inner}
        </Link>
      </PopoverClose>
    );
  }
  return (
    <PopoverClose asChild>
      <button type="button" onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    </PopoverClose>
  );
};

export const QuickSettingsPopover = () => {
  const { t } = useTranslation(['chrome', 'tours']);
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const floatingToolbar = useUI((s) => s.floatingToolbarEnabled);
  const setFloatingToolbar = useUI((s) => s.setFloatingToolbarEnabled);
  const readingWidth = useUI((s) => s.readingWidth);
  const setReadingWidth = useUI((s) => s.setReadingWidth);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const focused = params.get('focus') === '1';
  const { replay } = useTour();
  const [completedSnapshot, setCompletedSnapshot] = useState<string[]>(() =>
    getCompleted(),
  );

  useEffect(() => {
    setCompletedSnapshot(getCompleted());
  }, []);

  const handleFocus = () => {
    const next = new URLSearchParams(params);
    if (focused) next.delete('focus');
    else next.set('focus', '1');
    setParams(next, { replace: false });
  };

  const handleTour = (id: TourId) => {
    replay(id);
    setCompletedSnapshot(getCompleted());
  };

  return (
    <div
      data-testid="quick-settings-popover"
      className="w-72 bg-paper font-sans"
    >
      <div className="border-b border-rule px-4 pb-3 pt-3.5">
        <div className="font-serif text-[16px] font-medium tracking-tight text-ink">
          {t('chrome:quickSettings.title')}
        </div>
      </div>

      <Row label={t('chrome:quickSettings.themeLabel')}>
        <div className="flex flex-wrap gap-1">
          {THEMES.map((opt) => (
            <Tooltip key={opt.id}>
              <TooltipTrigger asChild>
                <Chip
                  active={theme === opt.id}
                  onClick={() => setTheme(opt.id)}
                  className="px-2 py-0.5 text-[10px]"
                  aria-label={t(`chrome:${opt.titleKey}`)}
                >
                  {t(`chrome:${opt.labelKey}`)}
                </Chip>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t(`chrome:${opt.titleKey}`)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </Row>

      <Row
        label={t('chrome:quickSettings.focusLabel')}
        hint={t('chrome:quickSettings.focusHint')}
      >
        <PillToggle
          on={focused}
          onToggle={handleFocus}
          label={t('chrome:quickSettings.focusLabel')}
        />
      </Row>

      <Row label={t('chrome:quickSettings.floatingToolbarLabel')}>
        <PillToggle
          on={floatingToolbar}
          onToggle={() => setFloatingToolbar(!floatingToolbar)}
          label={t('chrome:quickSettings.floatingToolbarLabel')}
        />
      </Row>

      <Row
        label={t('chrome:quickSettings.readingWidthLabel')}
        hint={t('chrome:quickSettings.readingWidthHint')}
      >
        <div className="flex gap-1">
          {(['s', 'm', 'l'] as ReadingWidth[]).map((w) => (
            <Chip
              key={w}
              active={readingWidth === w}
              onClick={() => setReadingWidth(w)}
              className="px-2 py-0.5 text-[10px] uppercase"
            >
              {t(`chrome:quickSettings.readingWidth.${w}`)}
            </Chip>
          ))}
        </div>
      </Row>

      <div className="px-4 pb-1.5 pt-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('chrome:quickSettings.helpToursLabel')}
      </div>

      {TOUR_IDS.map((id) => {
        const done = completedSnapshot.includes(id);
        return (
          <MenuItem
            key={id}
            onClick={() => handleTour(id)}
            done={done}
            kbd={id === 'welcome' ? t('chrome:quickSettings.helpKbd') : undefined}
          >
            {t(`tours:${TOURS[id].titleKey}`)}
          </MenuItem>
        );
      })}

      <div className="px-4 pb-1.5 pt-2.5 font-mono text-[9px] uppercase tracking-wider text-ink-4">
        {t('chrome:quickSettings.moreLabel')}
      </div>

      <ComingSoon
        hint={t('chrome:quickSettings.whatsNew')}
        side="left"
        className="w-full"
      >
        <span className="flex w-full items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2">
          <span className="h-3 w-3 shrink-0 opacity-0" />
          <span className="flex-1 text-left">
            {t('chrome:quickSettings.whatsNew')}
          </span>
        </span>
      </ComingSoon>

      <ComingSoon
        hint={t('chrome:quickSettings.feedback')}
        side="left"
        className="w-full"
      >
        <span className="flex w-full items-center gap-2 px-4 py-1.5 text-[13px] text-ink-2">
          <span className="h-3 w-3 shrink-0 opacity-0" />
          <span className="flex-1 text-left">
            {t('chrome:quickSettings.feedback')}
          </span>
        </span>
      </ComingSoon>

      <MenuItem asChild href={routes.about()}>
        {t('chrome:quickSettings.about')}
      </MenuItem>

      <div className="mt-1 flex items-center gap-3 border-t border-rule bg-paper-2 px-4 py-2.5">
        <PopoverClose asChild>
          <button
            type="button"
            onClick={() => navigate(routes.settings())}
            className="inline-flex items-center gap-1 border-b border-ink pb-px text-[12px] font-medium text-ink"
          >
            {t('chrome:quickSettings.fullSettings')}
          </button>
        </PopoverClose>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-ink-4">
          {t('chrome:quickSettings.fullSettingsKbd')}
        </span>
      </div>
    </div>
  );
};
