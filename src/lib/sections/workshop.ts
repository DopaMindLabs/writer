import type { Section } from '@/db/schema';

/**
 * The reserved label identifying a space's Workshop section. The Workshop is
 * special-cased throughout the sidebar (it hosts the Brain Space link) and is
 * protected from renaming and deletion so a space always keeps its workshop.
 */
export const WORKSHOP_SECTION_LABEL = 'Workshop';

export const isWorkshopLabel = (label: string): boolean =>
  label === WORKSHOP_SECTION_LABEL;

export const isWorkshopSection = (section: Pick<Section, 'label'>): boolean =>
  isWorkshopLabel(section.label);
