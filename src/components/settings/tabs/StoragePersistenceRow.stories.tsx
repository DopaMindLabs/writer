import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoragePersistenceRow } from './StoragePersistenceRow';

const withStorage = (persisted: boolean) => {
  Object.defineProperty(navigator, 'storage', {
    value: { persisted: async () => persisted },
    configurable: true,
  });
};

const meta = {
  title: 'Settings/StoragePersistenceRow',
  component: StoragePersistenceRow,
} satisfies Meta<typeof StoragePersistenceRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Protected: Story = {
  decorators: [
    (Story) => {
      withStorage(true);
      return <Story />;
    },
  ],
};

export const BestEffort: Story = {
  decorators: [
    (Story) => {
      withStorage(false);
      return <Story />;
    },
  ],
};
