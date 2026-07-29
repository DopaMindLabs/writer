import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { DocRowMenu } from './DocRowMenu';

const setup = ({ canManage = true }: { canManage?: boolean } = {}) => {
  const onRename = vi.fn();
  renderWithProviders(
    <DocRowMenu
      doc={sampleDoc}
      active={false}
      onRename={onRename}
      canManage={canManage}
    />,
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

  it('offers "Move to section" when the space structure is manageable', async () => {
    setup({ canManage: true });
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-move`),
    ).toBeInTheDocument();
  });

  it('hides "Move to section" when the space structure is locked', async () => {
    setup({ canManage: false });
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`sidebar-doc-${sampleDoc.id}-move`),
    ).not.toBeInTheDocument();
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
