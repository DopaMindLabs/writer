import { render } from '@testing-library/react';
import {
  PlaceholderAccentDots,
  PlaceholderChips,
  PlaceholderInput,
  PlaceholderSlider,
  PlaceholderSwatchRow,
  PlaceholderThemeCards,
  PlaceholderToggle,
} from './PlaceholderPrimitives';

describe('PlaceholderPrimitives', () => {
  it('renders PlaceholderToggle in the off (default) state', () => {
    const { container } = render(<PlaceholderToggle />);
    expect(container.querySelector('span')).not.toBeNull();
    expect(container.querySelector('span')!.className).toContain('bg-paper-2');
  });

  it('renders PlaceholderToggle in the on state', () => {
    const { container } = render(<PlaceholderToggle on />);
    expect(container.querySelector('span')!.className).toContain('bg-ink');
  });

  it('renders PlaceholderChips with the active index highlighted', () => {
    const { container } = render(
      <PlaceholderChips options={['A', 'B', 'C']} active={1} />,
    );
    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(3);
    expect(spans[1].className).toContain('bg-ink');
    expect(spans[0].className).not.toContain('bg-ink');
  });

  it('defaults PlaceholderChips active index to 0', () => {
    const { container } = render(
      <PlaceholderChips options={['A', 'B']} />,
    );
    const spans = container.querySelectorAll('span');
    expect(spans[0].className).toContain('bg-ink');
  });

  it('renders PlaceholderSlider with optional v label when supplied', () => {
    const { container, rerender } = render(<PlaceholderSlider />);
    expect(container.textContent).toContain('S');
    expect(container.textContent).toContain('L');
    rerender(<PlaceholderSlider pct={25} a="A" b="Z" v="42%" />);
    expect(container.textContent).toContain('42%');
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('Z');
  });

  it('renders PlaceholderInput in plain and mono styles', () => {
    const { container, rerender } = render(<PlaceholderInput value="hello" />);
    const span = container.querySelector('span')!;
    expect(span.textContent).toBe('hello');
    expect(span.className).not.toContain('font-mono');
    rerender(<PlaceholderInput value="HELLO" mono />);
    expect(container.querySelector('span')!.className).toContain('font-mono');
  });

  it('renders PlaceholderAccentDots with a checkmark on the first dot', () => {
    const { container } = render(<PlaceholderAccentDots />);
    // First dot contains the checkmark.
    expect(container.textContent).toContain('✓');
  });

  it('renders PlaceholderThemeCards with three cards and an ON badge on the first', () => {
    const { container, getByText } = render(<PlaceholderThemeCards />);
    expect(getByText('Linen')).toBeInTheDocument();
    expect(getByText('Studio')).toBeInTheDocument();
    expect(getByText('Midnight')).toBeInTheDocument();
    expect(container.textContent).toContain('ON');
  });

  it('renders PlaceholderSwatchRow with uppercase hex colour', () => {
    const { getByText } = render(
      <PlaceholderSwatchRow
        name="Bone"
        color="#fafaf6"
        rename="rename"
        tune="tune"
      />,
    );
    expect(getByText('Bone')).toBeInTheDocument();
    expect(getByText('#FAFAF6')).toBeInTheDocument();
    expect(getByText('rename')).toBeInTheDocument();
    expect(getByText('tune')).toBeInTheDocument();
  });
});
