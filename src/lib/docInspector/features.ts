
export type InspectorFeature = 'wordLimit' | 'charLimit' | 'status' | 'dueDate';
export type InspectorToggleKey = InspectorFeature | 'highlightOverLimit';

export interface InspectorToggleDescriptor {
  readonly id: InspectorToggleKey;
  readonly enabledByDefault: boolean;
}

export const INSPECTOR_FIELD_FEATURES: readonly {
  readonly id: InspectorFeature;
  readonly enabledByDefault: boolean;
}[] = [
  { id: 'wordLimit', enabledByDefault: true },
  { id: 'charLimit', enabledByDefault: true },
  { id: 'status', enabledByDefault: true },
  { id: 'dueDate', enabledByDefault: true },
];

export const INSPECTOR_TOGGLES: readonly InspectorToggleDescriptor[] = [
  ...INSPECTOR_FIELD_FEATURES,
  { id: 'highlightOverLimit', enabledByDefault: true },
];

export const INSPECTOR_FIELD_FEATURE_IDS: readonly InspectorFeature[] =
  INSPECTOR_FIELD_FEATURES.map((feature) => feature.id);

export const INSPECTOR_TOGGLE_KEYS: readonly InspectorToggleKey[] =
  INSPECTOR_TOGGLES.map((toggle) => toggle.id);
