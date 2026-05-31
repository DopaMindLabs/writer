import type { ComponentType } from 'react';
import { renderWithProviders } from '@/test/test-utils';
import * as Placeholders from './SpaceSettingsPlaceholders';

const COMPONENTS: (keyof typeof Placeholders)[] = [
  'SpaceTemplatePlaceholder',
  'SpacePalettePlaceholder',
  'SpaceSharingPlaceholder',
  'SpaceMembersPlaceholder',
  'SpaceExportPlaceholder',
];

describe('SpaceSettingsPlaceholders', () => {
  it.each(COMPONENTS)('renders %s without crashing', (name) => {
    const Component = Placeholders[name];
    const { container } = renderWithProviders(<Component />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent.length).toBeGreaterThan(0);
  });

  describe('snapshot', () => {
    it('should match the snapshot of every per-space placeholder panel', () => {
      const { container } = renderWithProviders(
        <div>
          {COMPONENTS.map((name) => {
            const Component = Placeholders[name] as ComponentType;
            return <Component key={name} />;
          })}
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
