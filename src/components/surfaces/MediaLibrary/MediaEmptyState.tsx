import { EmptyState } from '@/components/ui/EmptyState';

export const MediaEmptyState = () => (
  <EmptyState
    title="No PDFs yet"
    caption="Upload a PDF to build your library, then attach it to notes."
    data-testid="media-empty"
  />
);
