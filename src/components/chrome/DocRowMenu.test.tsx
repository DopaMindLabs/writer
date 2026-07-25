import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { DocRowMenu } from './DocRowMenu';

const setup = () => {
  const onRename = vi.fn();
  renderWithProviders(
    <DocRowMenu doc={sampleDoc} active={false} onRename={onRename} />,
  );
  return { onRename };
};

describe('DocRowMenu', () => {
  beforeEach(async () => {
    await seedBasicSpace();
  });

  it('opens the row menu with rename and delete items', async () => {
    setup();
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-delete`),
    ).toBeInTheDocument();
  });

  it('begins the inline rename once the menu has closed', async () => {
    const { onRename } = setup();
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    await userEvent.click(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename`),
    );
    await waitFor(() => {
      expect(onRename).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the delete confirmation from the menu', async () => {
    setup();
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    await userEvent.click(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-delete`),
    );
    expect(await screen.findByTestId('confirm-dialog')).toBeInTheDocument();
  });
});
