import { ArrowUpRight, Pencil, RefreshCw } from '@/components/libs/icons';
import { IconButton } from '@/components/ui/icon';

interface PdfCardActionsProps {
  noteId: string;
  busy: boolean;
  onOpenBeside: () => void;
  onEditUrl: () => void;
  onRefresh: () => void;
}

export const PdfCardActions = ({
  noteId,
  busy,
  onOpenBeside,
  onEditUrl,
  onRefresh,
}: PdfCardActionsProps) => (
  <div
    className="flex items-center gap-1"
    data-no-drag
    onPointerDown={(e) => { e.stopPropagation(); }}
  >
    <button
      type="button"
      onClick={onOpenBeside}
      data-testid={`brain-note-${noteId}-open-beside`}
      className="inline-flex items-center gap-1 border border-rule px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3 hover:border-ink hover:text-ink"
    >
      <ArrowUpRight className="h-3 w-3" aria-hidden />
      open beside editor
    </button>
    <IconButton
      icon={Pencil}
      iconSize="xs"
      label="Edit URL"
      onClick={onEditUrl}
      data-testid={`brain-note-${noteId}-edit-url`}
    />
    <IconButton
      icon={RefreshCw}
      iconSize="xs"
      label="Refresh PDF"
      onClick={onRefresh}
      disabled={busy}
      data-testid={`brain-note-${noteId}-refresh`}
    />
  </div>
);
