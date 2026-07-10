import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { SpaceTextSetting } from './SpaceTextSetting';

describe('SpaceTextSetting', () => {
  it('reports changes, commits on blur, and resets on Escape', () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    const onReset = vi.fn();
    renderWithProviders(
      <SpaceTextSetting
        label="Name"
        hint="The space name"
        ariaLabel="Name"
        testId="field"
        value="Novel"
        onChange={onChange}
        onCommit={onCommit}
        onReset={onReset}
      />,
    );
    const input = screen.getByTestId('field');
    fireEvent.change(input, { target: { value: 'Essays' } });
    expect(onChange).toHaveBeenCalledWith('Essays');
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledOnce();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onReset).toHaveBeenCalledOnce();
  });

  describe('snapshot', () => {
    it('should match the snapshot of the field with a label and hint', () => {
      const { container } = renderWithProviders(
        <SpaceTextSetting
          label="Space name"
          hint="Shown in the rail and title bar."
          ariaLabel="Space name"
          testId="field"
          value="Novel"
          onChange={() => undefined}
          onCommit={() => undefined}
          onReset={() => undefined}
        />,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
