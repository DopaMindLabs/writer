import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { INHERIT_INTERVAL } from '@/lib/sync/folderSync';
import { IntervalSelector } from './IntervalSelector';

describe('IntervalSelector', () => {
  it('renders interval options and reports the chosen value', () => {
    const onChange = vi.fn();
    renderWithProviders(<IntervalSelector value={10} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5 min' }));
    expect(onChange).toHaveBeenCalledWith(5);

    fireEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('prepends an inherit chip when inheritLabel is given', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <IntervalSelector
        value={INHERIT_INTERVAL}
        onChange={onChange}
        inheritLabel="Default (10 min)"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Default (10 min)' }));
    expect(onChange).toHaveBeenCalledWith(INHERIT_INTERVAL);
  });

  describe('snapshot', () => {
    it('should match the snapshot with and without the inherit chip', () => {
      const { container } = renderWithProviders(
        <div>
          <IntervalSelector value={10} onChange={() => undefined} />
          <IntervalSelector
            value={INHERIT_INTERVAL}
            onChange={() => undefined}
            inheritLabel="Default (10 min)"
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
