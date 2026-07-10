import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';

const runTourMock = vi.fn();
vi.mock('./driver-setup', () => ({
  runTour: (...args: unknown[]) => runTourMock(...args),
  runTourById: (...args: unknown[]) => runTourMock(...args),
}));

import { HelpMenu } from './HelpMenu';
import { markCompleted, getCompleted, TOURS_STORAGE_KEY } from './storage';
import { TOUR_IDS } from './tours';

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByLabelText('Help & tours'));
};

const getItem = (tourId: string): HTMLElement => {
  const item = document.querySelector<HTMLElement>(
    `[data-tour-id="${tourId}"]`,
  );
  if (!item) throw new Error(`Menu item with data-tour-id="${tourId}" not found`);
  return item;
};

describe('HelpMenu', () => {
  beforeEach(() => {
    runTourMock.mockClear();
    window.localStorage.clear();
  });

  it('lists every tour in the menu plus the reset entry', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpMenu />);
    await openMenu(user);

    for (const id of TOUR_IDS) {
      expect(getItem(id)).toBeInTheDocument();
    }
    expect(getItem('reset-all')).toBeInTheDocument();
  });

  it('starting a tour invokes runTour with the chosen tour definition', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HelpMenu />);
    await openMenu(user);

    await user.click(getItem('welcome'));

    expect(runTourMock).toHaveBeenCalledTimes(1);
    const arg = runTourMock.mock.calls[0][0] as { tour: { id: string } };
    expect(arg.tour.id).toBe('welcome');
  });

  it('shows a check next to tours that have been completed', async () => {
    markCompleted('writer');
    const user = userEvent.setup();
    renderWithProviders(<HelpMenu />);
    await openMenu(user);

    const writerCheck = getItem('writer').querySelector('svg');
    const welcomeCheck = getItem('welcome').querySelector('svg');

    expect(writerCheck?.getAttribute('class') ?? '').toContain('opacity-100');
    expect(welcomeCheck?.getAttribute('class') ?? '').toContain('opacity-0');
  });

  it('replay clears the completion flag before starting again', async () => {
    markCompleted('welcome');
    expect(getCompleted()).toEqual(['welcome']);

    const user = userEvent.setup();
    renderWithProviders(<HelpMenu />);
    await openMenu(user);
    await user.click(getItem('welcome'));

    expect(getCompleted()).toEqual([]);
    expect(runTourMock).toHaveBeenCalledTimes(1);
  });

  it('reset all clears the lipsum-tours entry without running a tour', async () => {
    markCompleted('welcome');
    markCompleted('writer');

    const user = userEvent.setup();
    renderWithProviders(<HelpMenu />);
    await openMenu(user);
    await user.click(getItem('reset-all'));

    expect(getCompleted()).toEqual([]);
    const raw = window.localStorage.getItem(TOURS_STORAGE_KEY);
    expect(JSON.parse(raw as string).completed).toEqual([]);
    expect(runTourMock).not.toHaveBeenCalled();
  });
});
