import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TOUR_IDS, TOURS, type TourId } from './tours';
import { useTour } from './useTour';
import { getCompleted } from './storage';

export function HelpMenu() {
  const { t } = useTranslation('tours');
  const { replay, resetAll } = useTour();
  const [completedSnapshot, setCompletedSnapshot] = useState<string[]>(() =>
    getCompleted(),
  );

  const refreshSnapshot = () => setCompletedSnapshot(getCompleted());

  function handleSelect(id: TourId) {
    replay(id);
    refreshSnapshot();
  }

  function handleResetAll() {
    resetAll();
    refreshSnapshot();
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && refreshSnapshot()}>
      <DropdownMenuTrigger
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
        aria-label={t('menu.help')}
        title={t('menu.help')}
        data-tour="tour-help-menu"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel>{t('menu.tours')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {TOUR_IDS.map((id) => {
          const done = completedSnapshot.includes(id);
          return (
            <DropdownMenuItem
              key={id}
              onSelect={() => handleSelect(id)}
              data-tour-id={id}
            >
              <Check
                className={cn('h-3.5 w-3.5', done ? 'opacity-100' : 'opacity-0')}
                aria-hidden
              />
              <span className="flex-1">{t(TOURS[id].titleKey)}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleResetAll}
          data-tour-id="reset-all"
          className="text-ink-3"
        >
          <span className="flex-1">{t('menu.resetAll')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
