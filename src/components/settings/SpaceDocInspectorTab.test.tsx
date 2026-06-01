import { describe, it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import type { Space } from '@/db/schema';
import { SpaceDocInspectorTab } from './SpaceDocInspectorTab';

const space: Space = {
  id: 's1',
  tag: 'SP',
  name: 'Space',
  shared: false,
  template: 'fiction',
  createdAt: 0,
  updatedAt: 0,
};

afterEach(async () => {
  await db.docInspectorConfigs.clear();
});

describe('SpaceDocInspectorTab', () => {
  it('defaults each feature to inherit', () => {
    render(<SpaceDocInspectorTab space={space} />);
    const inheritChips = screen.getAllByTestId('inspector-toggle-inherit');
    expect(inheritChips[0]).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists a per-space override', async () => {
    render(<SpaceDocInspectorTab space={space} />);
    // Rows are ordered status, wordLimit, …; the first Off chip is the status row.
    const offChips = screen.getAllByTestId('inspector-toggle-off');
    await userEvent.click(offChips[0]);
    await waitFor(async () => {
      expect((await db.docInspectorConfigs.get('s1'))?.status).toBe('off');
    });
  });
});
