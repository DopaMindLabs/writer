import { render } from '@/test/test-utils';
import { FormRow } from './FormRow';
import { TextField } from './TextField';

describe('FormRow', () => {
  describe('rendering', () => {
    it('should render the label text', () => {
      const { getByTestId } = render(
        <FormRow data-testid="fr" label="Document name" htmlFor="doc">
          <TextField data-testid="fr-input" id="doc" />
        </FormRow>,
      );
      expect(getByTestId('fr-label')).toHaveTextContent('Document name');
    });

    it('should associate the label with the control via htmlFor', () => {
      const { getByTestId } = render(
        <FormRow data-testid="fr" label="Name" htmlFor="doc-name">
          <TextField id="doc-name" />
        </FormRow>,
      );
      expect(getByTestId('fr-label')).toHaveAttribute('for', 'doc-name');
    });

    it('should render the control passed as children', () => {
      const { getByTestId } = render(
        <FormRow data-testid="fr" label="Name">
          <TextField data-testid="fr-input" placeholder="title" />
        </FormRow>,
      );
      expect(getByTestId('fr-input')).toHaveAttribute('placeholder', 'title');
    });
  });

  describe('variants', () => {
    it('should not render the hint when none is provided', () => {
      const { queryByTestId } = render(
        <FormRow data-testid="fr" label="Name">
          <TextField />
        </FormRow>,
      );
      expect(queryByTestId('fr-hint')).toBeNull();
    });

    it('should render the hint when provided', () => {
      const { getByTestId } = render(
        <FormRow
          data-testid="fr"
          label="Name"
          hint="Visible to collaborators."
        >
          <TextField />
        </FormRow>,
      );
      expect(getByTestId('fr-hint')).toHaveTextContent(
        'Visible to collaborators.',
      );
    });

    it('should not render the error when none is provided', () => {
      const { queryByTestId } = render(
        <FormRow data-testid="fr" label="Name">
          <TextField />
        </FormRow>,
      );
      expect(queryByTestId('fr-error')).toBeNull();
    });

    it('should render the error with a role=alert when provided', () => {
      const { getByTestId } = render(
        <FormRow data-testid="fr" label="Name" error="Name is required">
          <TextField />
        </FormRow>,
      );
      const err = getByTestId('fr-error');
      expect(err).toHaveAttribute('role', 'alert');
      expect(err).toHaveTextContent('Name is required');
    });

    it('should render both hint and error together', () => {
      const { getByTestId } = render(
        <FormRow
          data-testid="fr"
          label="Name"
          hint="Visible to others."
          error="Required"
        >
          <TextField />
        </FormRow>,
      );
      expect(getByTestId('fr-hint')).toHaveTextContent('Visible to others.');
      expect(getByTestId('fr-error')).toHaveTextContent('Required');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <FormRow data-testid="fr-snap-min" label="Name">
            <TextField />
          </FormRow>
          <FormRow data-testid="fr-snap-hint" label="Name" hint="Visible">
            <TextField />
          </FormRow>
          <FormRow data-testid="fr-snap-err" label="Name" error="Required">
            <TextField error />
          </FormRow>
          <FormRow
            data-testid="fr-snap-full"
            label="Name"
            hint="Visible"
            error="Required"
          >
            <TextField error />
          </FormRow>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
