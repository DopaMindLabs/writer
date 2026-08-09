import { ROUTE_PATHS, RouteName, routes } from './routes';

describe('notebook routes', () => {
  it('owns a space-scoped notebook route', () => {
    expect(ROUTE_PATHS[RouteName.WriterNotebook]).toBe('/s/:spaceId/notebooks/:notebookId');
    expect(routes.writerNotebook('space one', 'notebook/one')).toBe(
      '/s/space%20one/notebooks/notebook%2Fone',
    );
  });
});
