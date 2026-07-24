import { RouteName, ROUTE_PATHS, routes } from './routes';

describe('routes', () => {
  it('builds the media library path', () => {
    expect(routes.mediaLibrary('s1')).toBe('/s/s1/library');
  });

  it('registers the media library route pattern', () => {
    expect(ROUTE_PATHS[RouteName.MediaLibrary]).toBe('/s/:spaceId/library');
  });

  it('builds the deep-linkable media viewer path', () => {
    expect(routes.mediaView('s1', 'm1')).toBe('/s/s1/library/m1');
  });

  it('registers the media viewer route pattern', () => {
    expect(ROUTE_PATHS[RouteName.MediaView]).toBe('/s/:spaceId/library/:mediaId');
  });

  it('keeps the brain-space builder alongside the new library route', () => {
    expect(routes.brainSpace('s1')).toBe('/s/s1/brain-space');
  });
});
