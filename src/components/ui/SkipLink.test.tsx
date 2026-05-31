import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

afterEach(cleanup);

describe('SkipLink', () => {
  it('links to the default main landmark', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: 'Skip to content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('targets a custom id and label', () => {
    render(<SkipLink targetId="editor">Skip to editor</SkipLink>);
    const link = screen.getByRole('link', { name: 'Skip to editor' });
    expect(link).toHaveAttribute('href', '#editor');
  });

  it('is hidden until focused', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link')).toHaveClass('sr-only');
  });

  it('matches the snapshot', () => {
    const { container } = render(<SkipLink />);
    expect(container).toMatchSnapshot();
  });
});
