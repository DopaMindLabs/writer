import { cn } from '@/lib/utils';

export interface SettingsTabDef {
  id: string;
  label: string;
}

interface SettingsTabsProps {
  tabs: SettingsTabDef[];
  active: string;
  onSelect: (id: string) => void;
}

export function SettingsTabs({ tabs, active, onSelect }: SettingsTabsProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="shrink-0 border-b border-rule/60 bg-paper-2 md:w-56 md:border-b-0 md:border-r md:py-5"
    >
      <ul className="flex overflow-x-auto md:-ml-px md:flex-col md:overflow-visible">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center whitespace-nowrap border-b-2 px-4 py-3 text-left text-[13px] transition-colors md:border-b-0 md:border-l-2 md:px-6 md:py-2',
                  isActive
                    ? 'border-ink bg-paper font-medium text-ink'
                    : 'border-transparent text-ink-2 hover:bg-paper hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
