import { X } from 'lucide-react';
import { useUI } from '@/store/ui';
import { useSpace } from '@/hooks/useSpaces';
import { CitationsPane } from './CitationsPane';

interface CitationsSidePanelProps {
  spaceId: string;
}

export function CitationsSidePanel({ spaceId }: CitationsSidePanelProps) {
  const open = useUI((s) => s.citationsDrawerOpen);
  const close = useUI((s) => s.closeCitationsDrawer);
  const space = useSpace(spaceId);

  if (!open) return null;

  return (
    <aside
      aria-label="Citations"
      className="flex h-full w-full max-w-[32rem] shrink-0 flex-col border-l border-rule bg-paper animate-in slide-in-from-right duration-200"
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule px-2">
        <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Citations
        </span>
        <button
          type="button"
          onClick={close}
          aria-label="Close citations"
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-ink-4 hover:bg-paper-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <CitationsPane
          spaceId={spaceId}
          spaceName={space?.name}
          density="compact"
        />
      </div>
    </aside>
  );
}
