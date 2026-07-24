import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSpace } from '@/test/fixtures';
import type { Space } from '@/db/schema';
import { SpaceSubtitle } from './SpaceSubtitle';

describe('SpaceSubtitle', () => {
  it('shows only the private label, with no age, when no space is loaded', () => {
    renderWithProviders(<SpaceSubtitle space={undefined} />);
    const subtitle = screen.getByTestId('sidebar-space-subtitle');
    // No space means no creation date, so no age is appended to the label.
    expect(subtitle).toHaveTextContent('PRIVATE · LOCAL');
    expect(subtitle.textContent).toBe('PRIVATE · LOCAL');
  });

  it('appends the age to the private label for a freshly created private space', () => {
    const space: Space = {
      ...sampleSpace,
      shared: false,
      createdAt: Date.now(),
    };
    renderWithProviders(<SpaceSubtitle space={space} />);
    expect(screen.getByTestId('sidebar-space-subtitle')).toHaveTextContent(
      'PRIVATE · LOCAL · new',
    );
  });

  it('shows the shared label for a shared space', () => {
    const space: Space = {
      ...sampleSpace,
      shared: true,
      createdAt: Date.now(),
    };
    renderWithProviders(<SpaceSubtitle space={space} />);
    expect(screen.getByTestId('sidebar-space-subtitle')).toHaveTextContent(
      'SHARED · new',
    );
  });
});
