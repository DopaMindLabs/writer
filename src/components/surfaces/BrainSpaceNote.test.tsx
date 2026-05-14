import userEvent from '@testing-library/user-event';
import { renderAtRoute, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleDoc, sampleNote, sampleSpace } from '@/test/fixtures';
import { BrainSpaceNote } from './BrainSpaceNote';

function renderNote(
  note = sampleNote,
  overrides: Partial<{
    selected: boolean;
    pending: boolean;
    onPick: () => void;
  }> = {},
) {
  return renderAtRoute(
    <BrainSpaceNote
      note={note}
      spaceId={sampleSpace.id}
      selected={overrides.selected ?? false}
      pending={overrides.pending ?? false}
      onPick={overrides.onPick ?? (() => {})}
    />,
    { path: '/s/:spaceId', initialEntries: [`/s/${sampleSpace.id}`] },
  );
}

describe('BrainSpaceNote', () => {
  it('renders default note', () => {
    const { container } = renderNote();
    expect(container).toMatchSnapshot();
  });

  it('renders selected and pending note with title', () => {
    const { container } = renderNote(
      { ...sampleNote, title: 'A title' },
      { selected: true, pending: true },
    );
    expect(container).toMatchSnapshot();
  });

  it('calls onPick when the surface is pressed', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const { getByText } = renderNote(sampleNote, { onPick });
    await user.click(getByText('Hello'));
    expect(onPick).toHaveBeenCalled();
  });

  it('delete button removes the note (and cascades connections)', async () => {
    await db.notes.put(sampleNote);
    const user = userEvent.setup();
    const { getByLabelText } = renderNote();
    await user.click(getByLabelText('Delete note'));
    await waitFor(async () => {
      expect(await db.notes.get(sampleNote.id)).toBeUndefined();
    });
  });

  it('does not render the doc-link icon when linkedDocId is unset', () => {
    const { queryByLabelText } = renderNote();
    expect(queryByLabelText('Open linked doc')).toBeNull();
  });

  it('renders the doc-link icon when linkedDocId is set', async () => {
    await db.docs.put(sampleDoc);
    const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
    const { getByLabelText } = renderNote(linked);
    expect(getByLabelText('Open linked doc')).toBeInTheDocument();
  });

  it('clicking the doc-link icon does not trigger onPick', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const linked = { ...sampleNote, linkedDocId: sampleDoc.id };
    const { getByLabelText } = renderNote(linked, { onPick });
    await user.click(getByLabelText('Open linked doc'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
