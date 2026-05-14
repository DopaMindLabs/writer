import userEvent from '@testing-library/user-event';
import { renderWithProviders, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { seedBasicSpace } from '@/test/fixtures';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('renders sections, subsection, and doc link', async () => {
    await seedBasicSpace();
    const { container, findByText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await findByText('Test Space');
    await findByText('Sample Doc');
    expect(container).toMatchSnapshot();
  });

  it('clicking + on a section opens an add-doc input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await user.click(await findByLabelText('Add doc to Drafts'));
    expect(
      await findByPlaceholderText(/Doc name \(Enter to create\)/i),
    ).toBeInTheDocument();
  });

  it('Enter commits a new doc to Dexie', async () => {
    await seedBasicSpace();
    const beforeCount = await db.docs.count();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText } = renderWithProviders(
      <Sidebar spaceId="s1" activeDocId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    await user.click(await findByLabelText('Add doc to Drafts'));
    const input = await findByPlaceholderText(/Doc name/i);
    await user.clear(input);
    await user.type(input, 'New chapter{enter}');
    await waitFor(async () => {
      expect(await db.docs.count()).toBe(beforeCount + 1);
    });
  });

  it('Escape cancels the add-doc input', async () => {
    await seedBasicSpace();
    const user = userEvent.setup();
    const { findByLabelText, findByPlaceholderText, queryByPlaceholderText } =
      renderWithProviders(<Sidebar spaceId="s1" activeDocId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
    await user.click(await findByLabelText('Add doc to Drafts'));
    const input = await findByPlaceholderText(/Doc name/i);
    await user.type(input, 'abc{escape}');
    await waitFor(() => {
      expect(queryByPlaceholderText(/Doc name/i)).not.toBeInTheDocument();
    });
  });
});
