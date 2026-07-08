import { describe, expect, it } from 'vitest';
import * as tours from './index';

describe('src/tours barrel', () => {
  it('re-exports the tour registry, the hooks, the help menu and the storage helpers', () => {
    expect(tours.TOUR_IDS).toBeDefined();
    expect(tours.TOURS).toBeDefined();
    expect(typeof tours.useTour).toBe('function');
    expect(typeof tours.useAutoTour).toBe('function');
    expect(typeof tours.HelpMenu).toBe('function');
    expect(typeof tours.getCompleted).toBe('function');
    expect(typeof tours.isCompleted).toBe('function');
    expect(typeof tours.markCompleted).toBe('function');
    expect(typeof tours.resetTour).toBe('function');
    expect(typeof tours.resetAll).toBe('function');
    expect(typeof tours.TOURS_STORAGE_KEY).toBe('string');
  });
});
