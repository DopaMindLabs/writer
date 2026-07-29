import { describe, expect, it } from 'vitest';
import { dropMessage, type DragLabels } from './dragAnnounceText';

const labels: DragLabels = {
  label: (id) =>
    ({ sec1: 'Chapters', sec2: 'Notes', dA: 'Intro', dB: 'Draft' })[id] ?? id,
  sectionOfDoc: (docId) => ({ dA: 'sec1', dB: 'sec2' })[docId],
};

describe('dropMessage', () => {
  it('reads a no-op drop as a plain drop', () => {
    expect(dropMessage(null, 'dA', labels)).toEqual({
      key: 'sidebar.dragAnnounceDropped',
      vars: { label: 'Intro' },
    });
  });

  it('reads a section move as a reorder', () => {
    const drop = { kind: 'section', sectionId: 'sec2', toIndex: 0 } as const;
    expect(dropMessage(drop, 'sec2', labels)).toEqual({
      key: 'sidebar.dragAnnounceReordered',
      vars: { label: 'Notes' },
    });
  });

  it('reads a same-section document move as a reorder', () => {
    const drop = { kind: 'doc', docId: 'dA', toSectionId: 'sec1', toIndex: 1 } as const;
    expect(dropMessage(drop, 'dA', labels)).toEqual({
      key: 'sidebar.dragAnnounceReordered',
      vars: { label: 'Intro' },
    });
  });

  it('names the destination for a cross-section document move', () => {
    const drop = { kind: 'doc', docId: 'dA', toSectionId: 'sec2', toIndex: 0 } as const;
    expect(dropMessage(drop, 'dA', labels)).toEqual({
      key: 'sidebar.dragAnnounceMovedToSection',
      vars: { label: 'Intro', section: 'Notes' },
    });
  });

  it('falls back to the id when a label is unknown', () => {
    expect(dropMessage(null, 'ghost', labels).vars.label).toBe('ghost');
  });
});
