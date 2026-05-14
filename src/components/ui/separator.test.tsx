import { render } from '@/test/test-utils';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders horizontal and vertical orientations', () => {
    const { container } = render(
      <div>
        <Separator />
        <Separator orientation="vertical" />
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
