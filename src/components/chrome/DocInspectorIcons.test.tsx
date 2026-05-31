import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI, type InspectorSection } from '@/store/ui';
import { DocInspectorIcons } from './DocInspectorIcons';

const SECTIONS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

describe('DocInspectorIcons', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setInspectorMode('icons');
      useUI.getState().setInspectorSection('outline');
    });
  });

  describe('rendering', () => {
    it('should expose the doc-inspector-icons testid wrapper', () => {
      renderWithProviders(<DocInspectorIcons />);
      expect(screen.getByTestId('doc-inspector-icons')).toBeInTheDocument();
    });

    it('should render expand and collapse icon buttons', () => {
      renderWithProviders(<DocInspectorIcons />);
      expect(screen.getByTestId('doc-inspector-icons-expand')).toHaveAttribute(
        'aria-label',
        'Expand inspector',
      );
      expect(
        screen.getByTestId('doc-inspector-icons-collapse'),
      ).toHaveAttribute('aria-label', 'Collapse inspector');
    });

    it('should render all four section buttons with matching aria-label', () => {
      renderWithProviders(<DocInspectorIcons />);
      for (const id of SECTIONS) {
        const btn = screen.getByTestId(`doc-inspector-icons-${id}`);
        expect(btn).toHaveAttribute('aria-label', id.toUpperCase());
      }
    });
  });

  describe('expand', () => {
    it('should set inspectorMode to "expanded" when the expand button is clicked', async () => {
      renderWithProviders(<DocInspectorIcons />);
      await userEvent.click(screen.getByTestId('doc-inspector-icons-expand'));
      expect(useUI.getState().inspectorMode).toBe('expanded');
    });
  });

  describe('section buttons', () => {
    it.each(SECTIONS)(
      'should set inspectorSection to %s and expand the inspector when clicked',
      async (id) => {
        act(() => {
          useUI.getState().setInspectorSection('outline');
          useUI.getState().setInspectorMode('icons');
        });
        renderWithProviders(<DocInspectorIcons />);
        await userEvent.click(screen.getByTestId(`doc-inspector-icons-${id}`));
        expect(useUI.getState().inspectorSection).toBe(id);
        expect(useUI.getState().inspectorMode).toBe('expanded');
      },
    );

    it('should mark the active section with aria-current="page"', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspectorIcons />);
      expect(
        screen
          .getByTestId('doc-inspector-icons-history')
          .getAttribute('aria-current'),
      ).toBe('page');
      expect(
        screen
          .getByTestId('doc-inspector-icons-outline')
          .hasAttribute('aria-current'),
      ).toBe(false);
    });
  });

  describe('hideHistory (read mode)', () => {
    it('should not render the history icon when hideHistory is set', () => {
      renderWithProviders(<DocInspectorIcons hideHistory />);
      expect(
        screen.queryByTestId('doc-inspector-icons-history'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('doc-inspector-icons-outline'),
      ).toBeInTheDocument();
    });

    it('should coerce the active highlight off a hidden history section', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspectorIcons hideHistory />);
      expect(
        screen
          .getByTestId('doc-inspector-icons-outline')
          .getAttribute('aria-current'),
      ).toBe('page');
    });
  });

  describe('collapse', () => {
    it('should set inspectorMode to "none" when the collapse button is clicked', async () => {
      renderWithProviders(<DocInspectorIcons />);
      await userEvent.click(screen.getByTestId('doc-inspector-icons-collapse'));
      expect(useUI.getState().inspectorMode).toBe('none');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: outline } = renderWithProviders(<DocInspectorIcons />);
      expect(outline).toMatchSnapshot('section=outline');

      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      const { container: history } = renderWithProviders(<DocInspectorIcons />);
      expect(history).toMatchSnapshot('section=history');
    });
  });
});
