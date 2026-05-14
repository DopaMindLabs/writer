import userEvent from '@testing-library/user-event';
import { renderWithProviders, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import { TemplatesScreen } from './Templates';

describe('TemplatesScreen', () => {
  it('renders the template list and the submit form', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <TemplatesScreen />,
    );
    expect(getByText(/01 — A KIND OF ROOM/i)).toBeInTheDocument();
    expect(getByText(/Blank/i)).toBeInTheDocument();
    expect(getByLabelText(/Name/i)).toBeInTheDocument();
    expect(getByLabelText(/Tag/i)).toBeInTheDocument();
  });

  it('selecting a template updates the name and tag fields', async () => {
    const user = userEvent.setup();
    const { getByText, getByLabelText } = renderWithProviders(
      <TemplatesScreen />,
    );
    await user.click(getByText('Blank'));
    expect((getByLabelText(/Name/i) as HTMLInputElement).value).toBe('Blank');
    expect((getByLabelText(/Tag/i) as HTMLInputElement).value).toBe('BL');
  });

  it('typing in the name and tag fields updates the values', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = renderWithProviders(<TemplatesScreen />);
    const nameInput = getByLabelText(/Name/i) as HTMLInputElement;
    const tagInput = getByLabelText(/Tag/i) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'My space');
    await user.clear(tagInput);
    await user.type(tagInput, 'abc');
    expect(nameInput.value).toBe('My space');
    expect(tagInput.value).toBe('ABC');
  });

  it('submitting the form creates a space and navigates', async () => {
    const user = userEvent.setup();
    const { getByText, findByText } = renderWithProviders(<TemplatesScreen />);
    await user.click(getByText('Blank'));
    const submitButton = await findByText(/enter Blank/i);
    await user.click(submitButton);
    await waitFor(async () => {
      expect(await db.spaces.count()).toBeGreaterThan(0);
    });
  });
});
