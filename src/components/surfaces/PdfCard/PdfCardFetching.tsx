interface PdfCardFetchingProps {
  noteId: string;
}

export const PdfCardFetching = ({ noteId }: PdfCardFetchingProps) => (
  <div
    role="status"
    aria-live="polite"
    data-testid={`brain-note-${noteId}-pdf-loading`}
    className="flex items-center gap-2 border border-dashed border-rule bg-paper-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ink-3"
  >
    fetching PDF…
  </div>
);
