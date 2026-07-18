import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import type { Doc } from '@/db/schema';

vi.mock('@/lib/docs', () => ({
  setDocStatus: vi.fn(async () => {}),
}));

const { setDocStatus } = await import('@/lib/docs');
const { LockBanner } = await import('./LockBanner');

const doc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Locked Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
};

describe('LockBanner', () => {
  beforeEach(() => {
    vi.mocked(setDocStatus).mockClear();
  });

  it('renders the lock notice', () => {
    const { getByTestId } = render(<LockBanner doc={doc} />);
    expect(getByTestId('doc-lock-banner')).toBeInTheDocument();
  });

  it('returns the document to draft from the unlock action', async () => {
    const { getByRole } = render(<LockBanner doc={doc} />);
    await userEvent.click(getByRole('button', { name: /unlock to edit/i }));
    expect(setDocStatus).toHaveBeenCalledWith('d1', 'draft');
  });
});
