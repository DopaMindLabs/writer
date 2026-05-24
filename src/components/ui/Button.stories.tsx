import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, type ButtonKind, type ButtonSize } from './Button';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  args: { children: 'continue reading →' },
  argTypes: {
    kind: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'ghost', 'dangerous'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { kind: 'primary', children: 'save as my night queue' } };
export const Secondary: Story = { args: { kind: 'secondary', children: 'peek inside' } };
export const Ghost: Story = { args: { kind: 'ghost', children: 'continue reading →' } };
export const Dangerous: Story = { args: { kind: 'dangerous', children: 'delete space…' } };

const kinds: ButtonKind[] = ['primary', 'secondary', 'ghost', 'dangerous'];
const sizes: ButtonSize[] = ['sm', 'md', 'lg'];

export const Matrix: Story = {
  render: () => (
    <table className="border-separate border-spacing-4">
      <thead>
        <tr>
          <th />
          {sizes.map((s) => (
            <th key={s} className="font-mono text-[10px] uppercase text-ink-3">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {kinds.map((k) => (
          <tr key={k}>
            <th className="text-left font-mono text-[10px] uppercase text-ink-3">
              {k}
            </th>
            {sizes.map((s) => (
              <td key={s}>
                <Button kind={k} size={s}>
                  follow
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export const Disabled: Story = {
  args: { kind: 'primary', disabled: true, children: 'publish' },
};
