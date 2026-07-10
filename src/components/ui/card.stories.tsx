import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Card',
  component: Card,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Draft synced</CardTitle>
        <CardDescription>Last saved a few seconds ago.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-ink-2">
          Your changes are stored locally and will publish on next sync.
        </p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button kind="ghost" size="sm">
          Dismiss
        </Button>
        <Button size="sm">Review</Button>
      </CardFooter>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Heading</CardTitle>
        <CardDescription>Supporting description text.</CardDescription>
      </CardHeader>
    </Card>
  ),
};
