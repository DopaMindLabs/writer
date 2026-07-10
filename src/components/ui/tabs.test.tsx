import { render } from '@/test/test-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  it('renders tab list and content', () => {
    const { container } = render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Alpha</TabsTrigger>
          <TabsTrigger value="b">Beta</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Alpha panel</TabsContent>
        <TabsContent value="b">Beta panel</TabsContent>
      </Tabs>,
    );
    expect(container).toMatchSnapshot();
  });
});
