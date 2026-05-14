import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { FIXED_TIME, sampleNote } from '@/test/fixtures';
import type { Connection, Note } from '@/db/schema';
import { BrainSpaceConnection } from './BrainSpaceConnection';

const from: Note = { ...sampleNote, id: 'n1', l: 10, t: 10, w: 100, h: 60 };
const to: Note = { ...sampleNote, id: 'n2', l: 240, t: 200, w: 120, h: 80 };
const conn: Connection = {
  id: 'c1',
  spaceId: 's1',
  fromNoteId: 'n1',
  toNoteId: 'n2',
  createdAt: FIXED_TIME,
};

describe('BrainSpaceConnection', () => {
  it('renders SVG path between two notes', () => {
    const { container } = render(
      <svg>
        <BrainSpaceConnection connection={conn} from={from} to={to} />
      </svg>,
    );
    expect(container).toMatchSnapshot();
  });

  it('deletes the connection from Dexie when clicked', async () => {
    await db.connections.put(conn);
    const { container } = render(
      <svg>
        <BrainSpaceConnection connection={conn} from={from} to={to} />
      </svg>,
    );
    const group = container.querySelector('g.group') as SVGGElement;
    await userEvent.click(group);
    await waitFor(async () =>
      expect(await db.connections.get(conn.id)).toBeUndefined(),
    );
  });
});
