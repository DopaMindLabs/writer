import { render } from '@/test/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders kind and size combinations', () => {
    const { container } = render(
      <div>
        <Button>primary md</Button>
        <Button kind="secondary" size="sm">
          secondary sm
        </Button>
        <Button kind="ghost" size="lg">
          ghost lg
        </Button>
        <Button kind="dangerous">dangerous md</Button>
        <Button disabled>disabled</Button>
        <Button kind="ghost" size="sm" disabled>
          disabled ghost sm
        </Button>
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
