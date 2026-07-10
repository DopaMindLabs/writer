import { beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import * as seed from '@/db/seed';
import { keyMismatchState } from '@/lib/cloud/crypto/keyMismatch';
import { keylessLockState } from '@/lib/cloud/crypto/keylessLock';
import { CloudKeyMismatchError } from '@/lib/cloud/crypto/errors';
import { TemplatesScreen } from './Templates';

// Spy on space creation so failures can be simulated, while every test defaults
// to the real implementation (so the success/DB assertions still run for real).
const actualSeed = await vi.importActual<typeof import('@/db/seed')>('@/db/seed');
vi.mock('@/db/seed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/seed')>();
  return { ...actual, createSpaceFromTemplate: vi.fn() };
});
const createSpaceMock = vi.mocked(seed.createSpaceFromTemplate);

describe('TemplatesScreen', () => {
  beforeEach(() => {
    createSpaceMock.mockImplementation(actualSeed.createSpaceFromTemplate);
  });
  afterEach(() => {
    keyMismatchState.set(false);
    keylessLockState.set(false);
  });

  describe('rendering', () => {
    it('should render the templates screen with the name and tag inputs', () => {
      renderWithProviders(<TemplatesScreen />);
      expect(screen.getByTestId('templates-screen')).toBeInTheDocument();
      expect(screen.getByTestId('templates-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('templates-tag-input')).toBeInTheDocument();
    });

    it('should render the Blank template card with its label', () => {
      renderWithProviders(<TemplatesScreen />);
      const blank = screen.getByTestId('templates-card-blank');
      expect(blank).toHaveTextContent(/Blank/i);
    });
  });

  describe('selection', () => {
    it('should update the name and tag inputs to the selected template defaults', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      await user.click(screen.getByTestId('templates-card-blank'));
      const name = screen.getByTestId('templates-name-input') as HTMLInputElement;
      const tag = screen.getByTestId('templates-tag-input') as HTMLInputElement;
      expect(name.value).toBe('Blank');
      expect(tag.value).toBe('BL');
    });

    it('should mark the selected template card with aria-pressed=true', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      const blank = screen.getByTestId('templates-card-blank');
      await user.click(blank);
      expect(blank).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('input editing', () => {
    it('should update the name and tag inputs when the user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      const name = screen.getByTestId('templates-name-input') as HTMLInputElement;
      const tag = screen.getByTestId('templates-tag-input') as HTMLInputElement;
      await user.clear(name);
      await user.type(name, 'My space');
      await user.clear(tag);
      await user.type(tag, 'abc');
      expect(name.value).toBe('My space');
      expect(tag.value).toBe('ABC');
    });
  });

  describe('submit', () => {
    it('should create a space and navigate when the form is submitted', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      await user.click(screen.getByTestId('templates-card-blank'));
      const submit = screen.getByTestId('templates-submit');
      expect(submit).toHaveTextContent(/enter Blank/i);
      await user.click(submit);
      await waitFor(async () => {
        expect(await db.spaces.count()).toBeGreaterThan(0);
      });
    });

    it('should fall back to the template defaults when name and tag are cleared before submit', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      await user.click(screen.getByTestId('templates-card-blank'));
      const name = screen.getByTestId('templates-name-input');
      const tag = screen.getByTestId('templates-tag-input');
      await user.clear(name);
      await user.clear(tag);
      await user.click(screen.getByTestId('templates-submit'));
      await waitFor(async () => {
        const spaces = await db.spaces.toArray();
        expect(spaces.length).toBeGreaterThan(0);
        const last = spaces[spaces.length - 1];
        expect(last.name).toBe('Blank');
        expect(last.tag).toBe('BL');
      });
    });
  });

  describe('cloud write lock', () => {
    it('shows the mismatch banner and disables submit while the key-mismatch lock is engaged', () => {
      keyMismatchState.set(true);
      renderWithProviders(<TemplatesScreen />);
      expect(screen.getByTestId('templates-lock-banner')).toHaveTextContent(
        /encryption key has changed/i,
      );
      expect(screen.getByTestId('templates-submit')).toBeDisabled();
    });

    it('shows the keyless banner and disables submit while the keyless lock is engaged', () => {
      keylessLockState.set(true);
      renderWithProviders(<TemplatesScreen />);
      expect(screen.getByTestId('templates-lock-banner')).toHaveTextContent(
        /signed in without an encryption key/i,
      );
      expect(screen.getByTestId('templates-submit')).toBeDisabled();
    });

    it('surfaces the locked message when the write lock refuses the submit', async () => {
      createSpaceMock.mockRejectedValueOnce(new CloudKeyMismatchError());
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      await user.click(screen.getByTestId('templates-card-blank'));
      await user.click(screen.getByTestId('templates-submit'));
      expect(await screen.findByTestId('templates-lock-banner')).toHaveTextContent(
        /encryption is locked on this device/i,
      );
      // Submit is re-enabled so the user can retry after resolving the lock.
      expect(screen.getByTestId('templates-submit')).toBeEnabled();
    });

    it('surfaces a generic failure message when creating the space fails', async () => {
      createSpaceMock.mockRejectedValueOnce(new Error('boom'));
      const user = userEvent.setup();
      renderWithProviders(<TemplatesScreen />);
      await user.click(screen.getByTestId('templates-card-blank'));
      await user.click(screen.getByTestId('templates-submit'));
      expect(await screen.findByTestId('templates-error-banner')).toHaveTextContent(
        /something went wrong/i,
      );
      expect(screen.getByTestId('templates-submit')).toBeEnabled();
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderWithProviders(<TemplatesScreen />);
      expect(container).toMatchSnapshot();
    });
  });
});
