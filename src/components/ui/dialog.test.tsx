import { render } from '@/test/test-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

describe('Dialog', () => {
  it('renders closed dialog with trigger', () => {
    const { container } = render(
      <Dialog open={false}>
        <DialogTrigger asChild>
          <button type="button">open</button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>desc</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders content via portal when open', () => {
    const { getByText, getByRole } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>desc body</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(getByText('Confirm')).toBeInTheDocument();
    expect(getByText('desc body')).toBeInTheDocument();
    expect(getByRole('dialog')).toBeInTheDocument();
  });
});
