import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { addTrustedDomain, getTrustedDomains } from '@/lib/trusted-domains';
import { MediaPickerUrlTab } from './MediaPickerUrlTab';

const typeUrl = (value: string) => {
  fireEvent.change(screen.getByTestId('media-picker-url-field'), {
    target: { value },
  });
};

describe('MediaPickerUrlTab', () => {
  it('rejects a non-https url with an inline error and does not select', () => {
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerUrlTab onSelect={onSelect} />);
    typeUrl('http://arxiv.org/pdf/1.pdf');
    fireEvent.click(screen.getByTestId('media-picker-url-submit'));
    expect(screen.getByRole('alert')).toHaveTextContent('https://');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('rejects an unparseable url (the URL-parse failure branch)', () => {
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerUrlTab onSelect={onSelect} />);
    typeUrl('not a url');
    fireEvent.click(screen.getByTestId('media-picker-url-submit'));
    expect(screen.getByRole('alert')).toHaveTextContent('https://');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('selects immediately when the domain is already trusted', async () => {
    await addTrustedDomain('arxiv.org');
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerUrlTab onSelect={onSelect} />);
    typeUrl('https://arxiv.org/pdf/1706.03762.pdf');
    fireEvent.click(screen.getByTestId('media-picker-url-submit'));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('https://arxiv.org/pdf/1706.03762.pdf');
    });
  });

  it('prompts to trust an unknown domain, then trusts and selects on confirm', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerUrlTab onSelect={onSelect} />);
    typeUrl('https://unknown.test/a.pdf');
    fireEvent.click(screen.getByTestId('media-picker-url-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toHaveTextContent(
        'Trust PDFs from unknown.test?',
      );
    });

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('https://unknown.test/a.pdf');
    });
    expect(await getTrustedDomains()).toContain('unknown.test');
  });

  it('does not select or trust when the prompt is cancelled', async () => {
    const onSelect = vi.fn();
    renderWithProviders(<MediaPickerUrlTab onSelect={onSelect} />);
    typeUrl('https://unknown.test/a.pdf');
    fireEvent.click(screen.getByTestId('media-picker-url-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(await getTrustedDomains()).toEqual([]);
  });
});
