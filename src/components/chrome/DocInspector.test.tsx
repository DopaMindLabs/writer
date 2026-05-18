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

  it('renders the inspector aside with the doc name, badge, collapse button, and tabs', () => {
    renderWithProviders(<DocInspector docName="My doc" />);
    const aside = screen.getByTestId('doc-inspector');
    expect(aside).toBeInTheDocument();
    expect(aside.textContent).toContain('My doc');
    // Collapse chevron button (collapses to icons mode).
    expect(
      screen.getByRole('button', { name: /collapse/i }),
    ).toBeInTheDocument();
    // Four tab buttons.
    for (const id of SECTIONS) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${id}$`, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('shows an em-dash placeholder when docName is empty', () => {
    renderWithProviders(<DocInspector docName="" />);
    expect(screen.getByTestId('doc-inspector').textContent).toContain('—');
  });

  it('collapse button switches inspectorMode to "icons"', async () => {
    renderWithProviders(<DocInspector docName="X" />);
    await userEvent.click(
      screen.getByRole('button', { name: /collapse/i }),
    );
    expect(useUI.getState().inspectorMode).toBe('icons');
  });

  it.each(SECTIONS)(
    'clicking the %s tab updates inspectorSection and marks aria-current',
    async (id) => {
      act(() => {
        useUI.getState().setInspectorSection('outline');
      });
      renderWithProviders(<DocInspector docName="X" />);
      const tab = screen.getByRole('button', {
        name: new RegExp(`^${id}$`, 'i'),
      });
      await userEvent.click(tab);
      expect(useUI.getState().inspectorSection).toBe(id);
      // Re-render reflection: the active tab gets aria-current="page".
      expect(
        screen
          .getByRole('button', { name: new RegExp(`^${id}$`, 'i') })
          .getAttribute('aria-current'),
      ).toBe('page');
    },
  );

  it('renders the OutlinePane when section is "outline"', () => {
    act(() => {
      useUI.getState().setInspectorSection('outline');
    });
    renderWithProviders(<DocInspector docName="X" />);
    const aside = screen.getByTestId('doc-inspector');
    expect(aside.textContent).toMatch(/Mira walks/);
    expect(aside.textContent).toMatch(/bell-keeper/i);
  });

  it('renders the InfoPane when section is "info"', () => {
    act(() => {
      useUI.getState().setInspectorSection('info');
    });
    renderWithProviders(<DocInspector docName="X" />);
    const aside = screen.getByTestId('doc-inspector');
    // Word count row formatted as "1,204 / 1,500".
    expect(aside.textContent).toMatch(/1,204 \/ 1,500/);
    expect(aside.textContent).toMatch(/Draft/);
  });

  it('renders the HistoryPane when section is "history"', () => {
    act(() => {
      useUI.getState().setInspectorSection('history');
    });
    renderWithProviders(<DocInspector docName="X" />);
    const aside = screen.getByTestId('doc-inspector');
    expect(aside.textContent).toMatch(/first draft/i);
    expect(aside.textContent).toMatch(/pre-edit/i);
  });

  it('renders the ActionsPane when section is "actions"', () => {
    act(() => {
      useUI.getState().setInspectorSection('actions');
    });
    renderWithProviders(<DocInspector docName="X" />);
    const aside = screen.getByTestId('doc-inspector');
    expect(aside.textContent).toMatch(/rename/i);
    expect(aside.textContent).toMatch(/trash/i);
  });
});
