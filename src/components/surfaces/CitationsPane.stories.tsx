import type { Meta, StoryObj } from '@storybook/react-vite';
import { db } from '@/db/db';
import type { Citation } from '@/db/schema';
import { CitationsPane } from './CitationsPane';

const citation = (overrides: Partial<Citation> = {}): Citation => ({
  id: 'c-base',
  spaceId: 's1',
  key: 'smith2020',
  authors: 'Smith, John',
  title: 'On testing',
  year: 2020,
  type: 'article',
  useCount: 0,
  ...overrides,
});

// The basicSpace seed creates space s1 but no citations; add a few rows on top
// for the populated variants.
const seedCitations = async () => {
  await db.citations.bulkPut([
    citation({ id: 'c-a', key: 'alpha2020', title: 'Alpha findings', year: 2020 }),
    citation({
      id: 'c-b',
      key: 'beta2021',
      authors: 'Lee, Dana',
      title: 'Beta methods',
      year: 2021,
      type: 'book',
      useCount: 3,
    }),
    citation({
      id: 'c-c',
      key: 'gamma2019',
      authors: 'Ng, Wei',
      title: 'Gamma review',
      year: 2019,
      type: 'chapter',
      useCount: 1,
    }),
  ]);
};

const meta = {
  title: 'Surfaces/CitationsPane',
  component: CitationsPane,
  parameters: { layout: 'fullscreen', seed: 'basicSpace' },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full border border-rule">
        <Story />
      </div>
    ),
  ],
  args: { spaceId: 's1', spaceName: 'Test Space' },
} satisfies Meta<typeof CitationsPane>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {
  loaders: [async () => { await seedCitations(); return {}; }],
  args: { density: 'comfortable' },
};

export const Compact: Story = {
  loaders: [async () => { await seedCitations(); return {}; }],
  args: { density: 'compact' },
};

// No citations seeded beyond the empty space → empty state.
export const Empty: Story = {
  args: { density: 'comfortable' },
};
