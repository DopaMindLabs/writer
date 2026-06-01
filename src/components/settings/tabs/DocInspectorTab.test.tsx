import { describe, it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { DocInspectorTab } from './DocInspectorTab';

afterEach(async () => {
  await db.docInspectorConfigs.clear();
});

describe('DocInspectorTab', () => {
  it('renders a toggle per feature, all on by default', () => {
    render(<DocInspectorTab />);
    expect(screen.getByTestId('toggle-status')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('toggle-highlightOverLimit')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('persists turning a feature off', async () => {
    render(<DocInspectorTab />);
    await userEvent.click(screen.getByTestId('toggle-dueDate'));
    await waitFor(async () => {
      expect((await db.docInspectorConfigs.get('global'))?.dueDate).toBe('off');
    });
  });

  it('toggles a status stage off', async () => {
    render(<DocInspectorTab />);
    await userEvent.click(screen.getByTestId('stage-in-review'));
    await waitFor(async () => {
      const row = await db.docInspectorConfigs.get('global');
      expect(row?.statusStages?.['in-review']).toBe(false);
    });
  });
});
