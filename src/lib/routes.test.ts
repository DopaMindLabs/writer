import { RouteName, ROUTE_PATHS, routes } from './routes';

describe('routes', () => {
  it('builds the media library path', () => {
    expect(routes.mediaLibrary('s1')).toBe('/s/s1/library');
  });

  it('registers the media library route pattern', () => {
    expect(ROUTE_PATHS[RouteName.MediaLibrary]).toBe('/s/:spaceId/library');
  });

  it('keeps the brain-space builder alongside the new library route', () => {
    expect(routes.brainSpace('s1')).toBe('/s/s1/brain-space');
  });
});
