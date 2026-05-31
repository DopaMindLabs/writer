import type { ComponentType } from 'react';
import { renderWithProviders } from '@/test/test-utils';
import * as Placeholders from './GlobalSettingsPlaceholders';

const COMPONENTS: (keyof typeof Placeholders)[] = [
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
    const Component = Placeholders[name] as ComponentType;
    const { container } = renderWithProviders(<Component />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent.length).toBeGreaterThan(0);
  });

  describe('snapshot', () => {
    it('should match the snapshot of every global placeholder panel', () => {
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
