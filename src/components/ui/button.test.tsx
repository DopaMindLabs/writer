import { render } from '@/test/test-utils';
import { Button } from './button';

describe('Button', () => {
  it('renders variant and size combinations', () => {
    const { container } = render(
      <div>
        <Button>default md</Button>
        <Button variant="outline" size="sm">
          outline sm
        </Button>
        <Button variant="ghost" size="lg">
          ghost lg
        </Button>
        <Button variant="link">link md</Button>
        <Button size="icon" aria-label="icon-only" />
        <Button disabled>disabled</Button>
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
