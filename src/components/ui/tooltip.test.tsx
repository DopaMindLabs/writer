import { render } from '@/test/test-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

describe('Tooltip', () => {
  it('renders closed trigger inside provider', () => {
    const { container } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">hover me</button>
          </TooltipTrigger>
          <TooltipContent>tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(container).toMatchSnapshot();
  });
});
