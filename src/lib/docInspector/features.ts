// The configurable Doc Inspector toggles and their default state. Two kinds:
//   - field features (wordLimit / charLimit / status / dueDate) gate whether a
//     field's control is shown in the inspector — the feature toggle is the
//     single switch (a stored value is kept but hidden while the feature is off);
//   - the highlightOverLimit behaviour gates the editor's red over-limit
//     highlight, independently of the limit itself.
// All cascade global -> space and default on. Changing a default later is a
// one-line edit here.

export type InspectorFeature = 'wordLimit' | 'charLimit' | 'status' | 'dueDate';
export type InspectorToggleKey = InspectorFeature | 'highlightOverLimit';

export interface InspectorToggleDescriptor {
  readonly id: InspectorToggleKey;
  readonly enabledByDefault: boolean;
}

// Field-visibility features (each gates one inspector control).
export const INSPECTOR_FIELD_FEATURES: readonly {
  readonly id: InspectorFeature;
  readonly enabledByDefault: boolean;
}[] = [
  { id: 'wordLimit', enabledByDefault: true },
  { id: 'charLimit', enabledByDefault: true },
  { id: 'status', enabledByDefault: true },
  { id: 'dueDate', enabledByDefault: true },
];

// Every cascading toggle, including the highlight behaviour.
export const INSPECTOR_TOGGLES: readonly InspectorToggleDescriptor[] = [
  ...INSPECTOR_FIELD_FEATURES,
  { id: 'highlightOverLimit', enabledByDefault: true },
];

export const INSPECTOR_FIELD_FEATURE_IDS: readonly InspectorFeature[] =
  INSPECTOR_FIELD_FEATURES.map((feature) => feature.id);

export const INSPECTOR_TOGGLE_KEYS: readonly InspectorToggleKey[] =
  INSPECTOR_TOGGLES.map((toggle) => toggle.id);
