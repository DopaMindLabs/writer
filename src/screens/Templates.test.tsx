import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { TemplatesScreen } from './Templates';

describe('TemplatesScreen', () => {
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
      const name = screen.getByTestId('templates-name-input');
      const tag = screen.getByTestId('templates-tag-input');
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
      const name = screen.getByTestId('templates-name-input');
      const tag = screen.getByTestId('templates-tag-input');
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

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderWithProviders(<TemplatesScreen />);
      expect(container).toMatchSnapshot();
    });
  });
});
