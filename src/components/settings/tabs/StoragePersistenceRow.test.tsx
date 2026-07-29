import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StoragePersistenceRow } from './StoragePersistenceRow';

const stubStorage = (persisted: boolean): void => {
  Object.defineProperty(navigator, 'storage', {
    value: { persisted: async () => persisted },
    configurable: true,
  });
};

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage');
});

describe('StoragePersistenceRow', () => {
  it('labels the row and settles on the granted state', async () => {
    stubStorage(true);
    render(<StoragePersistenceRow />);
    const row = screen.getByTestId('settings-storage-protection');
    expect(row).toHaveTextContent(/storage protection/i);
    await waitFor(() => {
      expect(row).toHaveTextContent(/protected/i);
    });
  });

  it('settles on best effort when the browser declined', async () => {
    stubStorage(false);
    render(<StoragePersistenceRow />);
    await waitFor(() => {
      expect(
        screen.getByTestId('settings-storage-protection'),
      ).toHaveTextContent(/best effort/i);
    });
  });

  it('settles on not supported without the Storage API', async () => {
    render(<StoragePersistenceRow />);
    await waitFor(() => {
      expect(
        screen.getByTestId('settings-storage-protection'),
      ).toHaveTextContent(/not supported/i);
    });
  });
});
