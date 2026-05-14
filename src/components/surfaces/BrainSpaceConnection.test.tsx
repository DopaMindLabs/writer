import { render } from '@/test/test-utils';
import { FIXED_TIME, sampleNote } from '@/test/fixtures';
import type { Connection, Note } from '@/db/schema';
import { DumpConnection } from './DumpConnection';

describe('DumpConnection', () => {
  it('renders SVG path between two notes', () => {
    const from: Note = { ...sampleNote, id: 'n1', l: 10, t: 10, w: 100, h: 60 };
    const to: Note = { ...sampleNote, id: 'n2', l: 240, t: 200, w: 120, h: 80 };
    const conn: Connection = {
      id: 'c1',
      spaceId: 's1',
      fromNoteId: 'n1',
      toNoteId: 'n2',
      createdAt: FIXED_TIME,
    };

    const { container } = render(
      <svg>
        <DumpConnection connection={conn} from={from} to={to} />
      </svg>,
    );
    expect(container).toMatchSnapshot();
  });
});
