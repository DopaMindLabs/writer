import { render } from '@/test/test-utils';
import { Eyebrow } from './Eyebrow';

describe('Eyebrow', () => {
  it('renders size and tone combinations', () => {
    const { container } = render(
      <div>
        <Eyebrow>filed · serial fiction</Eyebrow>
        <Eyebrow size={9}>ch. 7 of 14</Eyebrow>
        <Eyebrow size={11} tone="ink2">
          micro-meta
        </Eyebrow>
        <Eyebrow tone="ink4">faint count</Eyebrow>
      </div>,
    );
    expect(container).toMatchSnapshot();
  });
});
