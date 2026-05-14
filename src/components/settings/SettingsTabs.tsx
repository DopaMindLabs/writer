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
      className="w-56 shrink-0 border-r border-rule/60 bg-paper-2 py-5"
    >
      <ul className="-ml-px flex flex-col">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center border-l-2 px-6 py-2 text-left text-[13px] transition-colors',
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
