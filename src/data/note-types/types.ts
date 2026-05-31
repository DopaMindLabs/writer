import { NoteLayout, type NoteKind } from '@/db/schema';
import type { TemplateStage } from '@/data/templates/types';

/**
 * What a given layout lets a card do. Capabilities belong to the LAYOUT (not the
 * kind) so a per-note layout override stays internally consistent.
 */
export interface NoteLayoutConfig {
  /** Show the title and body text editors. */
  allowsText: boolean;
  /** Allow image attachments. */
  allowsImages: boolean;
  /** The image is the primary content; the title is an optional caption, no body. */
  imageFirst: boolean;
}

/** The capabilities of each layout. Keyed by `NoteLayout` for exhaustiveness. */
export const NOTE_LAYOUT_CONFIG: Record<NoteLayout, NoteLayoutConfig> = {
  [NoteLayout.Text]: { allowsText: true, allowsImages: true, imageFirst: false },
  [NoteLayout.Image]: { allowsText: false, allowsImages: true, imageFirst: true },
};

/**
 * A versioned descriptor for a note/card kind, mirroring the shape of a
 * `Template`: a stable `kind` id, a human label, a default `layout`, and a
 * `version`/`stage` so a card type can evolve like a template does.
 */
export interface NoteTypeDescriptor {
  /** Stable identifier — the `NoteKind` this descriptor configures. */
  kind: NoteKind;
  /** Human-readable label shown on the card and toolbar. */
  label: string;
  /** Default presentation for cards of this kind. */
  layout: NoteLayout;
  /** Semver-style version; bump when the type's shape or behaviour changes. */
  version: string;
  /** Optional maturity stage (reuses the template maturity ladder). */
  stage?: TemplateStage;
  /** Optional toolbar sort order; lower appears first. */
  toolbarOrder?: number;
}
