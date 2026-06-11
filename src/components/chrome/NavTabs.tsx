import { cn } from '@/lib/utils';

export interface NavTabDef {
  id: string;
  label: string;
}

export interface NavTabGroup {
  label: string;
  tabs: NavTabDef[];
}

interface NavTabsProps {
  groups: NavTabGroup[];
  active: string;
  onSelect: (id: string) => void;
  label?: string;
}

const TabButton = ({
  tab,
  active,
  onSelect,
  testId,
}: {
  tab: NavTabDef;
  active: boolean;
  onSelect: (id: string) => void;
  testId?: string;
}) => {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => { onSelect(tab.id); }}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center whitespace-nowrap border-b-2 px-4 py-2.5 text-left text-[13px] transition-colors md:border-b-0 md:border-l-2 md:px-6 md:py-1.5',
        active
          ? 'border-ink bg-paper font-medium text-ink'
          : 'border-transparent text-ink-2 hover:bg-paper hover:text-ink',
      )}
    >
      {tab.label}
    </button>
  );
};

export const NavTabs = ({ groups, active, onSelect, label = 'Settings sections' }: NavTabsProps) => {
  return (
    <nav
      data-testid="settings-tabs"
      aria-label={label}
      className="contents"
    >
      <ul
        data-testid="settings-tabs-mobile"
        className="flex overflow-x-auto border-b border-rule/60 bg-paper-2 md:hidden"
      >
        {groups.flatMap((g) =>
          g.tabs.map((tab) => (
            <li key={tab.id} className="shrink-0">
              <TabButton
                tab={tab}
                active={tab.id === active}
                onSelect={onSelect}
                testId={`settings-tab-mobile-${tab.id}`}
              />
            </li>
          )),
        )}
      </ul>
      <div
        data-testid="settings-tabs-desktop"
        className="hidden flex-1 overflow-auto pb-3 pt-1.5 md:-ml-px md:block"
      >
        {groups.map((g, gi) => (
          <div key={gi} className="mb-1.5 last:mb-0">
            <div
              data-testid={`settings-tabs-group-${String(gi)}`}
              className="px-6 pb-1 pt-2.5 font-mono text-[9px] uppercase tracking-[0.089em] text-ink-4"
            >
              {g.label}
            </div>
            <ul>
              {g.tabs.map((tab) => (
                <li key={tab.id}>
                  <TabButton
                    tab={tab}
                    active={tab.id === active}
                    onSelect={onSelect}
                    testId={`settings-tab-${tab.id}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
};
