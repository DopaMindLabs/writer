import type { SidebarDrop } from './resolveSidebarDrop';

/** An i18n key plus its interpolation values for a drag announcement. */
export interface DragMessage {
  key: string;
  vars: { label: string; section?: string };
}

export interface DragLabels {
  /** Display label for a section or document id (falls back to the id). */
  label: (id: string) => string;
  /** The section a document currently belongs to, if known. */
  sectionOfDoc: (docId: string) => string | undefined;
}

/**
 * Resolve the announcement for a completed drag. Returns a key/vars pair so the
 * caller owns translation; this stays pure and i18n-agnostic. A section move or
 * a same-section document move reads as a reorder; a cross-section document move
 * names its destination; a no-op drop reads as a plain drop.
 */
export const dropMessage = (
  drop: SidebarDrop | null,
  activeId: string,
  labels: DragLabels,
): DragMessage => {
  const label = labels.label(activeId);
  if (!drop) return { key: 'sidebar.dragAnnounceDropped', vars: { label } };
  if (drop.kind === 'section') {
    return { key: 'sidebar.dragAnnounceReordered', vars: { label } };
  }
  if (labels.sectionOfDoc(drop.docId) === drop.toSectionId) {
    return { key: 'sidebar.dragAnnounceReordered', vars: { label } };
  }
  return {
    key: 'sidebar.dragAnnounceMovedToSection',
    vars: { label, section: labels.label(drop.toSectionId) },
  };
};
