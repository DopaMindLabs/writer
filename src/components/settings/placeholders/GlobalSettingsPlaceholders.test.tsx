import type { ComponentType } from 'react';
import { renderWithProviders, screen } from '@/test/test-utils';
import * as Placeholders from './GlobalSettingsPlaceholders';
import * as platform from '@/lib/shortcuts/platform';

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
  'BackupsPlaceholder',
];

describe('GlobalSettingsPlaceholders', () => {
  it.each(COMPONENTS)('renders %s without crashing', (name) => {
    const Component = Placeholders[name] as ComponentType;
    const { container } = renderWithProviders(<Component />);
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent.length).toBeGreaterThan(0);
  });

  describe('shortcut chords', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('shows Ctrl chords off Apple platforms instead of a fixed ⌘ glyph', () => {
      vi.spyOn(platform, 'isApplePlatform').mockReturnValue(false);
      renderWithProviders(<Placeholders.ShortcutsPlaceholder />);
      expect(screen.getByText('Ctrl+,')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+1')).toBeInTheDocument();
      expect(screen.queryByText(/⌘/)).not.toBeInTheDocument();
    });

    it('shows the Command glyphs on Apple platforms', () => {
      vi.spyOn(platform, 'isApplePlatform').mockReturnValue(true);
      renderWithProviders(<Placeholders.ShortcutsPlaceholder />);
      expect(screen.getByText('⌘,')).toBeInTheDocument();
      expect(screen.getByText('⌘B')).toBeInTheDocument();
    });

    it('keeps non-chord hints such as markdown prefixes literal', () => {
      vi.spyOn(platform, 'isApplePlatform').mockReturnValue(false);
      renderWithProviders(<Placeholders.ShortcutsPlaceholder />);
      expect(screen.getByText('# →')).toBeInTheDocument();
      expect(screen.getByText('## →')).toBeInTheDocument();
    });
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
