import { renderWithProviders } from '@/test/test-utils';
import * as Placeholders from './GlobalSettingsPlaceholders';

const COMPONENTS: Array<keyof typeof Placeholders> = [
  'GeneralPlaceholder',
  'AppearancePlaceholder',
  'TypographyPlaceholder',
  'ShortcutsPlaceholder',
  'TemplatesPlaceholder',
  'PalettesPlaceholder',
  'CitationsPlaceholder',
  'AnnotationPlaceholder',
  'ExportPlaceholder',
  'DataPlaceholder',
  'AccountPlaceholder',
  'AboutPlaceholder',
  'BackupsPlaceholder',
];

describe('GlobalSettingsPlaceholders', () => {
  it.each(COMPONENTS)('renders %s without crashing', (name) => {
    const Component = Placeholders[name];
    const { container } = renderWithProviders(<Component />);
    // Smoke-check: produces a non-empty DOM with at least a section/wrapper.
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
  });
});
