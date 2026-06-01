import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { DocInspectorConfig } from '@/db/schema';
import {
  DEFAULT_GLOBAL_CONFIG,
  GLOBAL_INSPECTOR_ID,
  resolveAll,
} from '@/lib/docInspector/config';
import type { InspectorToggleKey } from '@/lib/docInspector/features';

// The global defaults row, falling back to the declarative defaults while
// loading or before any row has been written.
export const useGlobalInspectorConfig = (): DocInspectorConfig =>
  useLiveQuery(() => db.docInspectorConfigs.get(GLOBAL_INSPECTOR_ID), []) ??
  DEFAULT_GLOBAL_CONFIG;

export interface EffectiveInspectorConfig {
  /** Each toggle resolved through the global -> space cascade. */
  effective: Record<InspectorToggleKey, boolean>;
  /** The space's own row, or null when it inherits everything. */
  own: DocInspectorConfig | null;
  /** The resolved global defaults. */
  global: DocInspectorConfig;
}

const FALLBACK: EffectiveInspectorConfig = {
  effective: resolveAll(DEFAULT_GLOBAL_CONFIG, null),
  own: null,
  global: DEFAULT_GLOBAL_CONFIG,
};

export const useEffectiveInspectorConfig = (
  spaceId: string | null | undefined,
): EffectiveInspectorConfig =>
  useLiveQuery(
    async () => {
      const global =
        (await db.docInspectorConfigs.get(GLOBAL_INSPECTOR_ID)) ??
        DEFAULT_GLOBAL_CONFIG;
      const own = spaceId
        ? ((await db.docInspectorConfigs.get(spaceId)) ?? null)
        : null;
      return { effective: resolveAll(global, own), own, global };
    },
    [spaceId],
  ) ?? FALLBACK;
