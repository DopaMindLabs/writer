import { render } from '@/test/test-utils';
import { Input } from './input';

describe('Input', () => {
  it('renders default, placeholder, and disabled variants', () => {
    const { container } = render(
      <div>
        <Input />
        <Input placeholder="enter text…" />
        <Input disabled defaultValue="readonly" />
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
