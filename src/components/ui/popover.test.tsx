import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from './popover';

function Harness() {
  return (
    <Popover>
      <PopoverTrigger>open</PopoverTrigger>
      <PopoverContent>
        <div>hello popover</div>
        <PopoverClose>close</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe('Popover primitives', () => {
  it('opens on trigger click and portals content', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText('hello popover')).toBeInTheDocument();
  });

  it('closes when PopoverClose is activated', async () => {
    renderWithProviders(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(await screen.findByText('hello popover')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByText('hello popover')).not.toBeInTheDocument();
  });
});
