import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { TypographyTab } from './TypographyTab';
import { useUI } from '@/store/ui';
import { useA11y } from '@/store/a11y';
import { DEFAULT_A11Y_PREFS } from '@/theme/a11y-prefs';

beforeEach(() => {
  localStorage.clear();
  useUI.setState({
    editorFont: 'serif',
    editorSize: 'base',
    editorSizeFollowsA11y: true,
  });
  useA11y.setState({ ...DEFAULT_A11Y_PREFS });
});

describe('TypographyTab', () => {
  it('renders both editor typography controls, the a11y follow toggle, and a preview', () => {
    renderWithProviders(<TypographyTab />);
    expect(screen.getByTestId('setting-editor-font')).toBeInTheDocument();
    expect(screen.getByTestId('setting-editor-size')).toBeInTheDocument();
    expect(screen.getByTestId('setting-editor-follows-a11y')).toBeInTheDocument();
    expect(screen.getByTestId('typography-preview')).toBeInTheDocument();
  });

  it('toggling "Follow Accessibility text size" persists the preference', () => {
    renderWithProviders(<TypographyTab />);
    const toggle = screen.getByRole('switch', {
      name: 'Follow Accessibility text size',
    });
    fireEvent.click(toggle);
    expect(useUI.getState().editorSizeFollowsA11y).toBe(false);
    expect(
      JSON.parse(localStorage.getItem('lorem-ui') ?? '{}').editorSizeFollowsA11y,
    ).toBe(false);
  });

  it('selecting a typeface updates and persists the universal default', () => {
    renderWithProviders(<TypographyTab />);
    fireEvent.click(screen.getByTestId('editor-font-sans'));
    expect(useUI.getState().editorFont).toBe('sans');
    expect(
      JSON.parse(localStorage.getItem('lorem-ui') ?? '{}').editorFont,
    ).toBe('sans');
  });

  it('selecting a body size updates and persists the universal default', () => {
    renderWithProviders(<TypographyTab />);
    fireEvent.click(screen.getByTestId('editor-size-lg'));
    expect(useUI.getState().editorSize).toBe('lg');
    expect(
      JSON.parse(localStorage.getItem('lorem-ui') ?? '{}').editorSize,
    ).toBe('lg');
  });

  it('preview reflects the active selection', () => {
    useUI.setState({ editorFont: 'mono', editorSize: 'xl' });
    renderWithProviders(<TypographyTab />);
    const preview = screen.getByTestId('typography-preview');
    expect(preview.getAttribute('data-editor-font')).toBe('mono');
    expect(preview.getAttribute('data-editor-size')).toBe('xl');
  });

  it('shows serif and base as active by default', () => {
    renderWithProviders(<TypographyTab />);
    const serifChip = screen.getByTestId('editor-font-serif');
    const baseChip = screen.getByTestId('editor-size-base');
    expect(serifChip.getAttribute('aria-pressed')).toBe('true');
    expect(baseChip.getAttribute('aria-pressed')).toBe('true');
  });

  it('only one font chip is active at a time', () => {
    renderWithProviders(<TypographyTab />);
    fireEvent.click(screen.getByTestId('editor-font-sans'));
    expect(screen.getByTestId('editor-font-sans').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('editor-font-serif').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('editor-font-mono').getAttribute('aria-pressed')).toBe('false');
  });
});
