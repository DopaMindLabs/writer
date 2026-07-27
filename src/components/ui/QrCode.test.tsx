import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QrCode } from './QrCode';

const PAYLOAD = 'W1:ICEiIyQlJicoKSorLC0uLw:1/1:eJwrSS0uUS9KLAA';

describe('QrCode', () => {
  it('renders an image with the accessible name it was given', () => {
    render(<QrCode value={PAYLOAD} label="Pairing offer code" />);
    expect(screen.getByRole('img', { name: 'Pairing offer code' })).toBeInTheDocument();
  });

  it('draws the symbol as a single path', () => {
    const { container } = render(<QrCode value={PAYLOAD} label="Code" />);
    expect(container.querySelectorAll('path')).toHaveLength(1);
  });

  it('takes its colour from the surrounding text, not a hard-coded value', () => {
    // The design system owns colour; the encoder returns geometry only, so the
    // symbol must inherit and stay correct in every theme.
    const { container } = render(<QrCode value={PAYLOAD} label="Code" />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('fill')).toBe('currentColor');
  });

  it('uses a square viewBox so the symbol is never distorted', () => {
    const { container } = render(<QrCode value={PAYLOAD} label="Code" />);
    const viewBox = container.querySelector('svg')?.getAttribute('viewBox');
    expect(viewBox).toMatch(/^0 0 (\d+) \1$/);
  });

  it('renders a bigger symbol for a longer payload', () => {
    const short = render(<QrCode value="hello" label="Code" />);
    const long = render(<QrCode value={'a'.repeat(1200)} label="Code" />);
    const edge = (result: ReturnType<typeof render>): number =>
      Number(result.container.querySelector('svg')?.getAttribute('viewBox')?.split(' ')[2]);
    expect(edge(long)).toBeGreaterThan(edge(short));
  });

  it('is deterministic — the same payload renders the same symbol', () => {
    const first = render(<QrCode value={PAYLOAD} label="Code" />);
    const second = render(<QrCode value={PAYLOAD} label="Code" />);
    const path = (result: ReturnType<typeof render>): string | null | undefined =>
      result.container.querySelector('path')?.getAttribute('d');
    expect(path(first)).toBe(path(second));
  });

  it('reports an unencodable payload instead of rendering a broken symbol', () => {
    // A payload past the symbol ceiling cannot be shown; saying so beats
    // rendering something a scanner will silently fail on.
    render(<QrCode value={'a'.repeat(5000)} label="Code" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('reports an empty payload the same way', () => {
    render(<QrCode value="" label="Code" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('passes through a class name so callers control layout', () => {
    const { container } = render(
      <QrCode value={PAYLOAD} label="Code" className="w-64" />,
    );
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('w-64');
  });
});
