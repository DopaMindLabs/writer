import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleSection } from '@/test/fixtures';
import type { Section } from '@/db/schema';
import { SectionHeader } from './SectionHeader';

const workshop: Section = { ...sampleSection, id: 'sec-ws', label: 'Workshop' };

const setup = (
  over: Partial<React.ComponentProps<typeof SectionHeader>> = {},
) => {
  const onAdd = vi.fn();
  const onAddNotebook = vi.fn();
  renderWithProviders(
    <SectionHeader
      section={sampleSection}
      docCount={2}
      containsActiveDoc={false}
      canManage
      onAdd={onAdd}
      onAddNotebook={onAddNotebook}
      {...over}
    />,
  );
  return { onAdd, onAddNotebook };
};

describe('SectionHeader', () => {
  it('renders the section label and its kebab menu', () => {
    setup();
    expect(
      screen.getByTestId('sidebar-section-sec1-header'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-section-sec1-label')).toHaveTextContent(
      'Drafts',
    );
    expect(screen.getByTestId('sidebar-section-sec1-menu')).toBeInTheDocument();
  });

  it('starts an inline rename on double-click for a modifiable section', async () => {
    const user = userEvent.setup();
    setup();
    await user.dblClick(screen.getByTestId('sidebar-section-sec1-label'));
    expect(
      await screen.findByTestId('sidebar-section-sec1-rename-input'),
    ).toBeInTheDocument();
  });

  it('rejects the reserved Workshop label with an accessible inline error', async () => {
    const user = userEvent.setup();
    setup();
    await user.dblClick(screen.getByTestId('sidebar-section-sec1-label'));
    const input = await screen.findByTestId('sidebar-section-sec1-rename-input');
    await user.clear(input);
    await user.type(input, 'Workshop{Enter}');

    const error = await screen.findByTestId('sidebar-section-sec1-rename-error');
    expect(error).toHaveTextContent('“Workshop” is a reserved section name');
    // Editing stays open, wired to the error for assistive tech.
    const editing = screen.getByTestId('sidebar-section-sec1-rename-input');
    expect(editing).toHaveAttribute('aria-invalid', 'true');
    expect(editing).toHaveAttribute('aria-describedby', error.id);

    // Escape backs out and clears the error (Enter blurred the field, so
    // refocus it first).
    editing.focus();
    await user.keyboard('{Escape}');
    expect(
      screen.queryByTestId('sidebar-section-sec1-rename-input'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('sidebar-section-sec1-rename-error'),
    ).not.toBeInTheDocument();
  });

  it('does not rename the Workshop section on double-click', async () => {
    const user = userEvent.setup();
    setup({ section: workshop });
    await user.dblClick(screen.getByTestId('sidebar-section-sec-ws-label'));
    expect(
      screen.queryByTestId('sidebar-section-sec-ws-rename-input'),
    ).not.toBeInTheDocument();
  });

  it('does not rename on double-click when the space cannot be managed', async () => {
    const user = userEvent.setup();
    setup({ canManage: false });
    await user.dblClick(screen.getByTestId('sidebar-section-sec1-label'));
    expect(
      screen.queryByTestId('sidebar-section-sec1-rename-input'),
    ).not.toBeInTheDocument();
  });

  it('adds a document from the kebab menu', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByTestId('sidebar-section-sec1-menu'));
    await user.click(await screen.findByTestId('sidebar-section-sec1-add-doc'));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
