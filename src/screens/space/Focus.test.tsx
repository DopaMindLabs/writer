import { renderAtRoute } from '@/test/test-utils';
import { FocusScreen } from './Focus';

describe('FocusScreen', () => {
  it('redirects to focused write route when params are present', () => {
    const { queryByTestId } = renderAtRoute(<FocusScreen />, {
      path: '/s/:spaceId/d/:docId/focus',
      initialEntries: ['/s/s1/d/d1/focus'],
    });
    // The screen unmounts after Navigate; the catch-all renders.
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });

  it('redirects home when params are missing', () => {
    const { queryByTestId } = renderAtRoute(<FocusScreen />, {
      path: '/focus',
      initialEntries: ['/focus'],
    });
    expect(queryByTestId('catch-all')).toBeInTheDocument();
  });
});
