// Read/resolve/write helpers for Doc Inspector enablement, mirroring the
// SyncConfig cascade (src/lib/sync/folderSync.ts). A row with spaceId ===
// 'global' holds the defaults; per-space rows override per toggle. Resolution
// per toggle: a space value of 'inherit' (or an absent space row) defers to the
// global default; otherwise the space value wins.

import { db } from '@/db/db';
import type { DocInspectorConfig, InspectorToggle } from '@/db/schema';
import {
  INSPECTOR_TOGGLE_KEYS,
  INSPECTOR_TOGGLES,
  type InspectorToggleKey,
} from './features';
import { DOC_STATUS_STAGES, type DocStatus } from './status';

export const GLOBAL_INSPECTOR_ID = 'global';

const defaultToggle = (key: InspectorToggleKey): InspectorToggle =>
  INSPECTOR_TOGGLES.find((toggle) => toggle.id === key)?.enabledByDefault ?? true
    ? 'on'
    : 'off';

// Declarative defaults: every toggle resolves from features.ts. Used when no
// global row has been written yet, so changing an enabledByDefault flag there
// changes the out-of-the-box behaviour here.
export const DEFAULT_GLOBAL_CONFIG: DocInspectorConfig = {
  spaceId: GLOBAL_INSPECTOR_ID,
  wordLimit: defaultToggle('wordLimit'),
  charLimit: defaultToggle('charLimit'),
  status: defaultToggle('status'),
  dueDate: defaultToggle('dueDate'),
  highlightOverLimit: defaultToggle('highlightOverLimit'),
};

const inheritedSpaceConfig = (spaceId: string): DocInspectorConfig => ({
  spaceId,
  wordLimit: 'inherit',
  charLimit: 'inherit',
  status: 'inherit',
  dueDate: 'inherit',
  highlightOverLimit: 'inherit',
});

export const getGlobalConfig = async (): Promise<DocInspectorConfig> =>
  (await db.docInspectorConfigs.get(GLOBAL_INSPECTOR_ID)) ??
  DEFAULT_GLOBAL_CONFIG;

export const getSpaceConfig = async (
  spaceId: string,
): Promise<DocInspectorConfig | null> =>
  (await db.docInspectorConfigs.get(spaceId)) ?? null;

export const setGlobalToggle = async (
  key: InspectorToggleKey,
  on: boolean,
): Promise<void> => {
  const current = await getGlobalConfig();
  await db.docInspectorConfigs.put({
    ...current,
    spaceId: GLOBAL_INSPECTOR_ID,
    [key]: on ? 'on' : 'off',
  });
};

export const setSpaceToggle = async (
  spaceId: string,
  key: InspectorToggleKey,
  value: InspectorToggle,
): Promise<void> => {
  const current =
    (await db.docInspectorConfigs.get(spaceId)) ??
    inheritedSpaceConfig(spaceId);
  await db.docInspectorConfigs.put({ ...current, spaceId, [key]: value });
};

export const setStatusStageEnabled = async (
  stage: DocStatus,
  on: boolean,
): Promise<void> => {
  const current = await getGlobalConfig();
  await db.docInspectorConfigs.put({
    ...current,
    spaceId: GLOBAL_INSPECTOR_ID,
    statusStages: { ...current.statusStages, [stage]: on },
  });
};

// Resolve a single toggle through the global -> space cascade.
export const resolveToggle = (
  global: DocInspectorConfig,
  space: DocInspectorConfig | null,
  key: InspectorToggleKey,
): boolean => {
  const own = space?.[key] ?? 'inherit';
  if (own === 'inherit') return global[key] !== 'off';
  return own === 'on';
};

// Resolve every toggle at once into a plain enabled/disabled record. Derived
// from INSPECTOR_TOGGLE_KEYS so adding a new toggle in features.ts propagates
// here without a parallel edit.
export const resolveAll = (
  global: DocInspectorConfig,
  space: DocInspectorConfig | null,
): Record<InspectorToggleKey, boolean> =>
  Object.fromEntries(
    INSPECTOR_TOGGLE_KEYS.map((key) => [key, resolveToggle(global, space, key)]),
  ) as Record<InspectorToggleKey, boolean>;

// The status stages currently offered by the picker (global row only in v1).
export const enabledStages = (global: DocInspectorConfig): DocStatus[] =>
  DOC_STATUS_STAGES.filter(
    (stage) => global.statusStages?.[stage.id] ?? stage.enabledByDefault,
  ).map((stage) => stage.id);
