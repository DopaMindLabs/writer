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

  it('renders the icons aside with expand, four section buttons, and collapse', () => {
    const { container } = renderWithProviders(<DocInspectorIcons />);
    expect(container).toMatchSnapshot();
  });

  it('exposes the doc-inspector-icons testid wrapper', () => {
    renderWithProviders(<DocInspectorIcons />);
    expect(screen.getByTestId('doc-inspector-icons')).toBeInTheDocument();
  });

  it('renders all four section buttons (outline, info, history, actions)', () => {
    renderWithProviders(<DocInspectorIcons />);
    for (const id of SECTIONS) {
      expect(
        screen.getByRole('button', { name: new RegExp(id, 'i') }),
      ).toBeInTheDocument();
    }
  });

  it('expand button click sets inspectorMode to "expanded"', async () => {
    renderWithProviders(<DocInspectorIcons />);
    await userEvent.click(
      screen.getByRole('button', { name: /expand/i }),
    );
    expect(useUI.getState().inspectorMode).toBe('expanded');
  });

  it.each(SECTIONS)(
    'clicking the %s section sets inspectorSection and expands the inspector',
    async (id) => {
      act(() => {
        useUI.getState().setInspectorSection('outline');
        useUI.getState().setInspectorMode('icons');
      });
      renderWithProviders(<DocInspectorIcons />);
      await userEvent.click(
        screen.getByRole('button', { name: new RegExp(id, 'i') }),
      );
      expect(useUI.getState().inspectorSection).toBe(id);
      expect(useUI.getState().inspectorMode).toBe('expanded');
    },
  );

  it('marks the active section with aria-current="page"', () => {
    act(() => {
      useUI.getState().setInspectorSection('history');
    });
    renderWithProviders(<DocInspectorIcons />);
    const historyBtn = screen.getByRole('button', { name: /history/i });
    expect(historyBtn.getAttribute('aria-current')).toBe('page');
    const outlineBtn = screen.getByRole('button', { name: /outline/i });
    expect(outlineBtn.hasAttribute('aria-current')).toBe(false);
  });

  it('collapse button click sets inspectorMode to "none"', async () => {
    renderWithProviders(<DocInspectorIcons />);
    await userEvent.click(
      screen.getByRole('button', { name: /collapse/i }),
    );
    expect(useUI.getState().inspectorMode).toBe('none');
  });
});
