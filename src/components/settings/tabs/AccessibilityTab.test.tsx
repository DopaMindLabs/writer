import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { AccessibilityTab } from './AccessibilityTab';
import { useA11y } from '@/store/a11y';
import { useUI } from '@/store/ui';
import { DEFAULT_A11Y_PREFS } from '@/theme/a11y-prefs';

beforeEach(() => {
  localStorage.clear();
  useA11y.setState({ ...DEFAULT_A11Y_PREFS });
  useUI.setState({ theme: 'light' });
});

describe('AccessibilityTab', () => {
  it('matches the snapshot at default preferences', () => {
    const { container } = renderWithProviders(<AccessibilityTab />);
    expect(container).toMatchSnapshot();
  });

  it('renders all preference controls', () => {
    renderWithProviders(<AccessibilityTab />);
    expect(
      screen.getByRole('radiogroup', { name: 'Theme & contrast' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Motion' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Text size' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Line spacing' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Always underline links' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Enhanced focus indicator' }),
    ).toBeInTheDocument();
  });

  it('changing the theme updates the UI store', () => {
    renderWithProviders(<AccessibilityTab />);
    fireEvent.click(screen.getByLabelText('Dark'));
    expect(useUI.getState().theme).toBe('dark');
  });

  it('selecting a text size updates and persists the preference', () => {
    renderWithProviders(<AccessibilityTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Large' }));
    expect(useA11y.getState().textScale).toBe('lg');
    expect(
      JSON.parse(localStorage.getItem('lorem-a11y') ?? '{}').textScale,
    ).toBe('lg');
  });

  it('toggling enhanced focus flips the focus-ring preference', () => {
    renderWithProviders(<AccessibilityTab />);
    fireEvent.click(
      screen.getByRole('switch', { name: 'Enhanced focus indicator' }),
    );
    expect(useA11y.getState().focusRing).toBe('enhanced');
  });

  it('reflects the stored motion preference as the active radio', () => {
    useA11y.setState({ motion: 'reduced' });
    renderWithProviders(<AccessibilityTab />);
    const reduced = screen.getByLabelText('Reduced') as HTMLInputElement;
    expect(reduced.checked).toBe(true);
  });

  it('reset restores preferences to their defaults without touching the theme', () => {
    useUI.setState({ theme: 'dark' });
    useA11y.setState({
      motion: 'reduced',
      textScale: 'xl',
      lineSpacing: 'loose',
      linkUnderline: 'always',
      focusRing: 'enhanced',
    });
    renderWithProviders(<AccessibilityTab />);
    fireEvent.click(screen.getByTestId('a11y-reset'));
    expect(useA11y.getState().motion).toBe('auto');
    expect(useA11y.getState().textScale).toBe('base');
    expect(useA11y.getState().lineSpacing).toBe('normal');
    expect(useA11y.getState().linkUnderline).toBe('auto');
    expect(useA11y.getState().focusRing).toBe('standard');
    // The theme preference is intentionally left untouched.
    expect(useUI.getState().theme).toBe('dark');
  });
});
