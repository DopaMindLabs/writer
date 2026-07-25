import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { sampleDoc } from '@/test/fixtures';
import { DocLink } from './DocLink';

const setup = (
  over: {
    active?: boolean;
    href?: string;
    indented?: boolean;
    canManage?: boolean;
  } = {},
) => {
  renderWithProviders(
    <DocLink
      doc={sampleDoc}
      href={over.href ?? '/s/s1/d/d1'}
      active={over.active ?? false}
      canManage={over.canManage ?? true}
      indented={over.indented}
    />,
  );
};

describe('DocLink', () => {
  it('links to the document and shows its name and empty-count glyph', () => {
    setup();
    const link = screen.getByTestId(`sidebar-doc-${sampleDoc.id}`);
    expect(link).toHaveAttribute('href', '/s/s1/d/d1');
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-name`),
    ).toHaveTextContent('Sample Doc');
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-count`),
    ).toHaveTextContent('◌');
  });

  it('renders the row overflow menu', () => {
    setup();
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-menu`),
    ).toBeInTheDocument();
  });

  it('emphasises the name when the document is active', () => {
    setup({ active: true });
    expect(
      screen.getByTestId(`sidebar-doc-${sampleDoc.id}-name`),
    ).toHaveClass('font-medium');
  });

  it('enters inline rename on double-click', async () => {
    const user = userEvent.setup();
    setup();
    expect(
      screen.queryByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`),
    ).not.toBeInTheDocument();
    await user.dblClick(screen.getByTestId(`sidebar-doc-${sampleDoc.id}`));
    expect(
      await screen.findByTestId(`sidebar-doc-${sampleDoc.id}-rename-input`),
    ).toBeInTheDocument();
  });
});
