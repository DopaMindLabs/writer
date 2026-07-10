import { describe, it, expect, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { db } from '@/db/db';
import { DocInspectorTab } from './DocInspectorTab';

afterEach(async () => {
  await db.docInspectorConfigs.clear();
});

describe('DocInspectorTab', () => {
  it('renders an On/Off selector per feature (no inherit chip), all On by default', () => {
    render(<DocInspectorTab />);
    const status = screen.getByRole('group', { name: 'Status' });
    expect(within(status).getByTestId('inspector-toggle-on')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(status).getByTestId('inspector-toggle-off')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(
      within(status).queryByTestId('inspector-toggle-inherit'),
    ).toBeNull();
  });

  it('persists turning a feature off', async () => {
    render(<DocInspectorTab />);
    const dueDate = screen.getByRole('group', { name: 'Due date' });
    await userEvent.click(within(dueDate).getByTestId('inspector-toggle-off'));
    await waitFor(async () => {
      expect((await db.docInspectorConfigs.get('global'))?.dueDate).toBe('off');
    });
  });

  it('persists turning a feature back on', async () => {
    await db.docInspectorConfigs.put({
      spaceId: 'global',
      wordLimit: 'off',
      charLimit: 'on',
      status: 'on',
      dueDate: 'on',
      highlightOverLimit: 'on',
    });
    render(<DocInspectorTab />);
    const wordLimit = await screen.findByRole('group', { name: 'Word limit' });
    await userEvent.click(within(wordLimit).getByTestId('inspector-toggle-on'));
    await waitFor(async () => {
      expect((await db.docInspectorConfigs.get('global'))?.wordLimit).toBe('on');
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
