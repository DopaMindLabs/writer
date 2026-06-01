// The document workflow stages offered by the Doc Inspector's Status control.
// This registry is the single source of truth: `order` drives the picker order,
// `locks` marks the stages that lock the document body from editing (so a
// finished document is preserved), and `enabledByDefault` seeds which stages
// appear before the user customises them in settings.

export type DocStatus =
  | 'draft'
  | 'in-progress'
  | 'in-review'
  | 'complete'
  | 'published';

export interface DocStatusStage {
  readonly id: DocStatus;
  readonly order: number;
  readonly locks: boolean;
  readonly enabledByDefault: boolean;
}

export const DOC_STATUS_STAGES: readonly DocStatusStage[] = [
  { id: 'draft', order: 0, locks: false, enabledByDefault: true },
  { id: 'in-progress', order: 1, locks: false, enabledByDefault: true },
  { id: 'in-review', order: 2, locks: false, enabledByDefault: true },
  { id: 'complete', order: 3, locks: true, enabledByDefault: true },
  { id: 'published', order: 4, locks: true, enabledByDefault: true },
];

export const DEFAULT_STATUS: DocStatus = 'draft';

const STAGE_BY_ID = new Map<string, DocStatusStage>(
  DOC_STATUS_STAGES.map((stage) => [stage.id, stage]),
);

export const isDocStatus = (value: unknown): value is DocStatus =>
  typeof value === 'string' && STAGE_BY_ID.has(value);

// Coerce a persisted/untrusted status into a known stage. Legacy values (the
// old capitalised 'Draft' literal, or undefined) resolve to the default draft
// stage, which is editable — so existing documents never become locked.
export const resolveStatus = (raw: string | undefined): DocStatus =>
  isDocStatus(raw) ? raw : DEFAULT_STATUS;

export const isLockedStatus = (raw: string | undefined): boolean =>
  STAGE_BY_ID.get(resolveStatus(raw))?.locks ?? false;
