import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { ReaderBackLink } from './ReaderBackLink';

describe('ReaderBackLink', () => {
  it('links to the space library with an accessible name', () => {
    renderWithProviders(<ReaderBackLink spaceId="s1" />);
    const link = screen.getByTestId('media-viewer-back');
    expect(link).toHaveAttribute('href', '/s/s1/library');
    expect(link).toHaveAccessibleName();
  });
});
