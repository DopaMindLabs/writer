import { render, screen } from '@/test/test-utils';
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

  it('applies eyebrow styling to the child element when asChild is set', () => {
    render(
      <table>
        <thead>
          <tr>
            <Eyebrow asChild size={9} tone="ink3">
              <th>when</th>
            </Eyebrow>
          </tr>
        </thead>
      </table>,
    );
    const cell = screen.getByText('when');
    expect(cell.tagName).toBe('TH');
    expect(cell).toHaveClass('font-mono', 'uppercase', 'text-[9px]', 'text-ink-3');
  });
});
