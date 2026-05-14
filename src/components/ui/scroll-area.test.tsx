import { render } from '@/test/test-utils';
import { ScrollArea, ScrollBar } from './scroll-area';

describe('ScrollArea', () => {
  it('renders with content', () => {
    const { container } = render(
      <ScrollArea className="h-32 w-32">
        <div style={{ height: 400 }}>
          <p>line 1</p>
          <p>line 2</p>
        </div>
      </ScrollArea>,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders a horizontal ScrollBar inside a ScrollArea', () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar orientation="horizontal" />
        <div>content</div>
      </ScrollArea>,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
