import type { InspectorToggleKey } from '@/lib/docInspector/features';

// Shared row descriptors for the global and per-space Doc Inspector settings
// tabs. labelKey/hintKey are suffixes under the `settings.docInspector.*`
// translation namespace, so both tabs label the same toggles identically.
export interface InspectorToggleRow {
  key: InspectorToggleKey;
  labelKey: string;
  hintKey: string;
}

export const INSPECTOR_TOGGLE_ROWS: readonly InspectorToggleRow[] = [
  { key: 'status', labelKey: 'statusLabel', hintKey: 'statusHint' },
  { key: 'wordLimit', labelKey: 'wordLimitLabel', hintKey: 'wordLimitHint' },
  { key: 'charLimit', labelKey: 'charLimitLabel', hintKey: 'charLimitHint' },
  { key: 'dueDate', labelKey: 'dueDateLabel', hintKey: 'dueDateHint' },
  {
    key: 'highlightOverLimit',
    labelKey: 'highlightLabel',
    hintKey: 'highlightHint',
  },
];
