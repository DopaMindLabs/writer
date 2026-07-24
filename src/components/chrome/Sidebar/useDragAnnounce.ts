import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DragEndEvent, DragStartEvent } from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
import { resolveSidebarDrop } from './resolveSidebarDrop';
import { dropMessage, type DragLabels } from './dragAnnounceText';

const buildLabels = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
): DragLabels => {
  const names = new Map<string, string>();
  const sections = new Map<string, string>();
  for (const section of topSections) names.set(section.id, section.label);
  for (const [sectionId, docs] of docsForSection) {
    for (const doc of docs) {
      names.set(doc.id, doc.name);
      sections.set(doc.id, sectionId);
    }
  }
  return {
    label: (id) => names.get(id) ?? id,
    sectionOfDoc: (docId) => sections.get(docId),
  };
};

export interface DragAnnounce {
  announcement: string;
  announceStart: (event: DragStartEvent) => void;
  announceEnd: (event: DragEndEvent) => void;
}

/**
 * Human-readable screen-reader announcements for sidebar drags, replacing
 * dnd-kit's default id-based region (which is hidden — see
 * {@link useHiddenLiveRegionHost}). Announces the picked-up item on start and
 * the resolved move on end.
 */
export const useDragAnnounce = (
  topSections: Section[],
  docsForSection: Map<string, Doc[]>,
): DragAnnounce => {
  const { t } = useTranslation('chrome');
  const [announcement, setAnnouncement] = useState('');
  const labels = useMemo(
    () => buildLabels(topSections, docsForSection),
    [topSections, docsForSection],
  );

  const announceStart = ({ active }: DragStartEvent): void => {
    setAnnouncement(
      t('sidebar.dragAnnouncePickedUp', { label: labels.label(String(active.id)) }),
    );
  };

  const announceEnd = ({ active, over }: DragEndEvent): void => {
    const activeId = String(active.id);
    const drop = over
      ? resolveSidebarDrop({
          topSections,
          docsForSection,
          activeId,
          overId: String(over.id),
        })
      : null;
    const message = dropMessage(drop, activeId, labels);
    setAnnouncement(t(message.key, message.vars));
  };

  return { announcement, announceStart, announceEnd };
};
