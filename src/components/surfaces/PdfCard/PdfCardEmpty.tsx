import { FileText } from '@/components/libs/icons';

interface PdfCardEmptyProps {
  noteId: string;
  onPick: () => void;
}

export const PdfCardEmpty = ({ noteId, onPick }: PdfCardEmptyProps) => (
  <button
    type="button"
    onClick={onPick}
    onPointerDown={(e) => { e.stopPropagation(); }}
    data-no-drag
    data-testid={`brain-note-${noteId}-pdf-empty`}
    className="flex w-full flex-col items-center gap-1 border border-dashed border-rule bg-paper-2 px-3 py-4 text-ink-3 hover:border-ink hover:text-ink"
  >
    <FileText className="h-5 w-5" aria-hidden />
    <span className="font-mono text-[10px] uppercase tracking-wider">
      Select PDF
    </span>
  </button>
);
