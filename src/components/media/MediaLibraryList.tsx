import { Eyebrow } from '@/components/ui/Eyebrow';
import { MediaRow } from './MediaRow';
import type { MediaItem } from '@/db/schema';

/** One rendered list section: a group under the recent sort (with a date label),
 * or the whole flat list under the name/pages sorts (`label: null`). */
export interface MediaSection {
  key: string;
  label: string | null;
  items: MediaItem[];
}

interface MediaLibraryListProps {
  sections: MediaSection[];
  counts: Map<string, number>;
  onOpen: (item: MediaItem) => void;
}

/** Renders the grouped (or flat) list of rows; a section shows its date header
 * only when it carries a label. */
export const MediaLibraryList = ({
  sections,
  counts,
  onOpen,
}: MediaLibraryListProps) => (
  <div data-testid="media-library-list">
    {sections.map((section) => (
      <section key={section.key}>
        {section.label !== null && (
          <Eyebrow
            data-testid="media-library-group"
            className="block pb-2 pt-4 text-ink-3"
          >
            {section.label}
          </Eyebrow>
        )}
        {section.items.map((item) => (
          <MediaRow
            key={item.id}
            item={item}
            highlightCount={counts.get(item.id) ?? 0}
            onOpen={onOpen}
          />
        ))}
      </section>
    ))}
  </div>
);
