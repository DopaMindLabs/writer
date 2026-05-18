import { renderWithProviders } from '@/test/test-utils';
import * as Placeholders from './SpaceSettingsPlaceholders';

const COMPONENTS: Array<keyof typeof Placeholders> = [
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
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});
