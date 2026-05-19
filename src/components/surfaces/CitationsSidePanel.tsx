import { Maximize2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '@/store/ui';
import { useSpace } from '@/hooks/useSpaces';
import { IconButton } from '@/components/ui/icon';
import { CitationsPane } from './CitationsPane';

interface CitationsSidePanelProps {
  spaceId: string;
}

export function CitationsSidePanel({ spaceId }: CitationsSidePanelProps) {
  const open = useUI((s) => s.citationsDrawerOpen);
  const close = useUI((s) => s.closeCitationsDrawer);
  const space = useSpace(spaceId);
  const navigate = useNavigate();

  if (!open) return null;

  function openCitationsScreen() {
    close();
    navigate(`/s/${spaceId}/citations`);
  }

  return (
    <aside
      aria-label="Citations"
      className="fixed inset-0 z-40 flex h-full w-full flex-col bg-paper animate-in slide-in-from-right duration-200 md:static md:inset-auto md:z-auto md:max-w-[32rem] md:shrink-0 md:border-l md:border-rule"
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-rule px-2">
        <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Citations
        </span>
        <div className="flex items-center">
          <IconButton
            icon={Maximize2}
            iconSize="md"
            label="Open citations in full view"
            onClick={openCitationsScreen}
          />
          <IconButton
            icon={X}
            iconSize="md"
            label="Close citations"
            onClick={close}
          />
        </div>
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
