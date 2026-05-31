import { render } from '@/test/test-utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

describe('Card', () => {
  it('renders full card composition', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title here</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
        <CardContent>Some content</CardContent>
        <CardFooter>Footer slot</CardFooter>
      </Card>,
    );
    expect(container).toMatchSnapshot();
  });
});
