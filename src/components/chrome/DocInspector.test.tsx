import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI, type InspectorSection } from '@/store/ui';
import { DocInspector } from './DocInspector';

const SECTIONS: InspectorSection[] = ['outline', 'info', 'history', 'actions'];

describe('DocInspector', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setInspectorMode('expanded');
      useUI.getState().setInspectorSection('outline');
    });
  });

  describe('rendering', () => {
    it('should render the inspector aside with the doc name, collapse button, and tab strip', () => {
      renderWithProviders(<DocInspector docName="My doc" />);
      const aside = screen.getByTestId('doc-inspector');
      expect(aside).toBeInTheDocument();
      expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent(
        'My doc',
      );
      expect(screen.getByTestId('doc-inspector-collapse')).toHaveAttribute(
        'aria-label',
        'Collapse inspector',
      );
      for (const id of SECTIONS) {
        const tab = screen.getByTestId(`doc-inspector-tab-${id}`);
        expect(tab).toHaveTextContent(new RegExp(`^${id}$`, 'i'));
      }
    });

    it('should show an em-dash placeholder when docName is empty', () => {
      renderWithProviders(<DocInspector docName="" />);
      expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent('—');
    });
  });

  describe('collapse button', () => {
    it('should switch inspectorMode to "icons" when clicked', async () => {
      renderWithProviders(<DocInspector docName="X" />);
      await userEvent.click(screen.getByTestId('doc-inspector-collapse'));
      expect(useUI.getState().inspectorMode).toBe('icons');
    });
  });

  describe('tab strip', () => {
    it.each(SECTIONS)(
      'should update inspectorSection and mark aria-current when the %s tab is clicked',
      async (id) => {
        act(() => {
          useUI.getState().setInspectorSection('outline');
        });
        renderWithProviders(<DocInspector docName="X" />);
        const tab = screen.getByTestId(`doc-inspector-tab-${id}`);
        await userEvent.click(tab);
        expect(useUI.getState().inspectorSection).toBe(id);
        expect(
          screen
            .getByTestId(`doc-inspector-tab-${id}`)
            .getAttribute('aria-current'),
        ).toBe('page');
      },
    );
  });

  describe('panes', () => {
    it('should render the OutlinePane when section is "outline"', () => {
      act(() => {
        useUI.getState().setInspectorSection('outline');
      });
      renderWithProviders(<DocInspector docName="X" />);
      const pane = screen.getByTestId('doc-inspector-pane-outline');
      expect(pane).toHaveTextContent(/Mira walks/);
      expect(pane).toHaveTextContent(/bell-keeper/i);
    });

    it('should render the InfoPane when section is "info"', () => {
      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      renderWithProviders(<DocInspector docName="X" />);
      const pane = screen.getByTestId('doc-inspector-pane-info');
      expect(pane).toHaveTextContent(/1,204 \/ 1,500/);
      expect(pane).toHaveTextContent(/Draft/);
    });

    it('should render the HistoryPane when section is "history"', () => {
      act(() => {
        useUI.getState().setInspectorSection('history');
      });
      renderWithProviders(<DocInspector docName="X" />);
      const pane = screen.getByTestId('doc-inspector-pane-history');
      expect(pane).toHaveTextContent(/first draft/i);
      expect(pane).toHaveTextContent(/pre-edit/i);
    });

    it('should render the ActionsPane when section is "actions"', () => {
      act(() => {
        useUI.getState().setInspectorSection('actions');
      });
      renderWithProviders(<DocInspector docName="X" />);
      const pane = screen.getByTestId('doc-inspector-pane-actions');
      expect(pane).toHaveTextContent(/rename/i);
      expect(pane).toHaveTextContent(/trash/i);
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: outline } = renderWithProviders(
        <DocInspector docName="My doc" />,
      );
      expect(outline).toMatchSnapshot('section=outline');

      act(() => {
        useUI.getState().setInspectorSection('info');
      });
      const { container: info } = renderWithProviders(
        <DocInspector docName="My doc" />,
      );
      expect(info).toMatchSnapshot('section=info');

      const { container: empty } = renderWithProviders(
        <DocInspector docName="" />,
      );
      expect(empty).toMatchSnapshot('docName=empty');
    });
  });
});
