import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc, seedBasicSpace } from '@/test/fixtures';
import { DocRowMenu } from './DocRowMenu';

describe('DocRowMenu', () => {
  beforeEach(async () => {
    await seedBasicSpace();
  });

  it('opens the row menu', async () => {
    renderWithProviders(<DocRowMenu doc={sampleDoc} />);
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename`),
    ).toBeInTheDocument();
  });

  it('opens the rename dialog from the menu', async () => {
    renderWithProviders(<DocRowMenu doc={sampleDoc} />);
    await userEvent.click(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    );
    await userEvent.click(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename`),
    );
    expect(await screen.findByTestId('rename-doc-input')).toBeInTheDocument();
  });
});
