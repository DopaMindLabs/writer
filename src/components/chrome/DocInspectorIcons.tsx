import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  List,
  Info,
  History,
  MoreHorizontal,
  X,
} from '@/components/libs/icons';
import { useUI, type InspectorSection } from '@/store/ui';
import { IconButton } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const ITEMS: { id: InspectorSection; Icon: typeof List }[] = [
  { id: 'outline', Icon: List },
  { id: 'info', Icon: Info },
  { id: 'history', Icon: History },
  { id: 'actions', Icon: MoreHorizontal },
];

export const DocInspectorIcons = () => {
  const { t } = useTranslation('chrome');
  const setInspectorMode = useUI((s) => s.setInspectorMode);
  const section = useUI((s) => s.inspectorSection);
  const setSection = useUI((s) => s.setInspectorSection);

  return (
    <aside
      data-testid="doc-inspector-icons"
      className="hidden w-11 shrink-0 flex-col items-center gap-1 border-l border-rule bg-paper-2 py-3.5 md:flex"
    >
      <IconButton
        data-testid="doc-inspector-icons-expand"
        icon={ChevronLeft}
        label={t('inspector.expand')}
        title={t('inspector.expand')}
        onClick={() => setInspectorMode('expanded')}
      />
      <div className="my-1.5 h-px w-4 bg-rule" aria-hidden />
      {ITEMS.map(({ id, Icon }) => {
        const on = section === id;
        // @lint-ignore native-button: icon tab strip; needs a LinkedTabStrip primitive (tracked for PR 5)
        return (
          <button
            key={id}
            data-testid={`doc-inspector-icons-${id}`}
            type="button"
            onClick={() => {
              setSection(id);
              setInspectorMode('expanded');
            }}
            aria-label={t(`inspector.tabs.${id}`)}
            title={t(`inspector.tabs.${id}`)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              on
                ? 'text-ink'
                : 'text-ink-3 hover:bg-paper hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
      <div className="flex-1" />
      <IconButton
        data-testid="doc-inspector-icons-collapse"
        icon={X}
        label={t('inspector.collapse')}
        title={t('inspector.collapse')}
        onClick={() => setInspectorMode('none')}
      />
    </aside>
  );
};
