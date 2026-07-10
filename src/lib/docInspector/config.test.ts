import { describe, it, expect, afterEach } from 'vitest';
import { db } from '@/db/db';
import type { DocInspectorConfig } from '@/db/schema';
import {
  DEFAULT_GLOBAL_CONFIG,
  enabledStages,
  getGlobalConfig,
  getSpaceConfig,
  resolveAll,
  resolveToggle,
  setGlobalToggle,
  setSpaceToggle,
  setStatusStageEnabled,
} from './config';

const cfg = (over: Partial<DocInspectorConfig>): DocInspectorConfig => ({
  spaceId: 'global',
  wordLimit: 'on',
  charLimit: 'on',
  status: 'on',
  dueDate: 'on',
  highlightOverLimit: 'on',
  ...over,
});

afterEach(async () => {
  await db.docInspectorConfigs.clear();
});

describe('DEFAULT_GLOBAL_CONFIG', () => {
  it('enables every toggle out of the box', () => {
    expect(DEFAULT_GLOBAL_CONFIG).toMatchObject({
      wordLimit: 'on',
      charLimit: 'on',
      status: 'on',
      dueDate: 'on',
      highlightOverLimit: 'on',
    });
  });
});

describe('resolveToggle', () => {
  const global = cfg({});

  it('uses the global default when the space row is absent', () => {
    expect(resolveToggle(global, null, 'status')).toBe(true);
    expect(resolveToggle(cfg({ status: 'off' }), null, 'status')).toBe(false);
  });

  it('defers to the global default when the space inherits', () => {
    const space = cfg({ spaceId: 's1', status: 'inherit' });
    expect(resolveToggle(global, space, 'status')).toBe(true);
    expect(resolveToggle(cfg({ status: 'off' }), space, 'status')).toBe(false);
  });

  it('lets an explicit space value win over the global default', () => {
    expect(
      resolveToggle(cfg({ status: 'off' }), cfg({ status: 'on' }), 'status'),
    ).toBe(true);
    expect(
      resolveToggle(cfg({ status: 'on' }), cfg({ status: 'off' }), 'status'),
    ).toBe(false);
  });
});

describe('resolveAll', () => {
  it('resolves every toggle into a record', () => {
    const effective = resolveAll(cfg({ wordLimit: 'off' }), null);
    expect(effective.wordLimit).toBe(false);
    expect(effective.charLimit).toBe(true);
    expect(effective.highlightOverLimit).toBe(true);
  });
});

describe('enabledStages', () => {
  it('offers all five stages by default', () => {
    expect(enabledStages(cfg({}))).toEqual([
      'draft',
      'in-progress',
      'in-review',
      'complete',
      'published',
    ]);
  });

  it('drops a stage explicitly disabled in statusStages', () => {
    expect(enabledStages(cfg({ statusStages: { 'in-review': false } }))).toEqual(
      ['draft', 'in-progress', 'complete', 'published'],
    );
  });
});

describe('db round-trips', () => {
  it('getGlobalConfig falls back to defaults with no row', async () => {
    expect(await getGlobalConfig()).toEqual(DEFAULT_GLOBAL_CONFIG);
  });

  it('setGlobalToggle persists one toggle and leaves the rest on', async () => {
    await setGlobalToggle('status', false);
    const row = await getGlobalConfig();
    expect(row.status).toBe('off');
    expect(row.wordLimit).toBe('on');
  });

  it('setSpaceToggle writes an override leaving others inheriting', async () => {
    await setSpaceToggle('s1', 'wordLimit', 'off');
    const row = await getSpaceConfig('s1');
    expect(row?.wordLimit).toBe('off');
    expect(row?.charLimit).toBe('inherit');
  });

  it('setStatusStageEnabled toggles a single stage', async () => {
    await setStatusStageEnabled('published', false);
    const row = await getGlobalConfig();
    expect(row.statusStages?.published).toBe(false);
    expect(enabledStages(row)).not.toContain('published');
  });
});
