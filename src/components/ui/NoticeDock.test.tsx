import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { NoticeDock } from './NoticeDock';

describe('NoticeDock', () => {
  it('holds what it is given', () => {
    renderWithProviders(
      <NoticeDock>
        <p>Something to say</p>
      </NoticeDock>,
    );

    expect(screen.getByText('Something to say')).toBeInTheDocument();
  });

  it('sits out of the flow, so nothing it appears beside moves', () => {
    // An in-flow notice would shift the line being typed the moment it arrived,
    // which is an interruption whatever the notice says.
    renderWithProviders(<NoticeDock>notice</NoticeDock>);

    expect(screen.getByTestId('notice-dock')).toHaveClass('fixed');
  });

  it('lets clicks through everywhere except the notice itself', async () => {
    const user = userEvent.setup();
    const onNotice = vi.fn();
    renderWithProviders(
      <NoticeDock>
        <button type="button" onClick={onNotice}>
          Act
        </button>
      </NoticeDock>,
    );

    // The dock spans a corner of the viewport; swallowing a press meant for the
    // page beneath it would make a notice a modal by accident.
    expect(screen.getByTestId('notice-dock')).toHaveClass('pointer-events-none');

    await user.click(screen.getByRole('button', { name: 'Act' }));

    expect(onNotice).toHaveBeenCalledOnce();
  });

  it('takes no focus of its own', () => {
    renderWithProviders(<NoticeDock>notice</NoticeDock>);

    expect(screen.getByTestId('notice-dock')).not.toHaveAttribute('tabindex');
    expect(document.activeElement).toBe(document.body);
  });
});
