import { render } from '@/test/test-utils';
import { Fieldset } from './Fieldset';
import { FormRow } from './FormRow';
import { TextField } from './TextField';

describe('Fieldset', () => {
  describe('rendering', () => {
    it('should render the label inside a legend', () => {
      const { getByTestId } = render(
        <Fieldset data-testid="fs" label="Account · 03">
          <div>child</div>
        </Fieldset>,
      );
      expect(getByTestId('fs-legend').tagName).toBe('LEGEND');
      expect(getByTestId('fs-legend')).toHaveTextContent('Account · 03');
    });

    it('should render its children inside the body container', () => {
      const { getByTestId } = render(
        <Fieldset data-testid="fs" label="Group">
          <span data-testid="fs-child">inside</span>
        </Fieldset>,
      );
      expect(getByTestId('fs-body')).toContainElement(getByTestId('fs-child'));
    });

    it('should render as a fieldset element', () => {
      const { getByTestId } = render(
        <Fieldset data-testid="fs" label="Group">
          <div />
        </Fieldset>,
      );
      expect(getByTestId('fs').tagName).toBe('FIELDSET');
    });
  });

  describe('composition', () => {
    it('should compose with FormRow children', () => {
      const { getByTestId } = render(
        <Fieldset data-testid="fs" label="Account · 03">
          <FormRow data-testid="fs-row-1" label="Name">
            <TextField data-testid="fs-row-1-input" />
          </FormRow>
          <FormRow data-testid="fs-row-2" label="Email">
            <TextField data-testid="fs-row-2-input" type="email" />
          </FormRow>
        </Fieldset>,
      );
      expect(getByTestId('fs-row-1-label')).toHaveTextContent('Name');
      expect(getByTestId('fs-row-2-label')).toHaveTextContent('Email');
      expect(getByTestId('fs-row-2-input')).toHaveAttribute('type', 'email');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot with and without rows', () => {
      const { container } = render(
        <div>
          <Fieldset data-testid="fs-snap-empty" label="empty">
            <div />
          </Fieldset>
          <Fieldset data-testid="fs-snap-rows" label="rows">
            <FormRow data-testid="fs-snap-rows-row" label="Name">
              <TextField />
            </FormRow>
          </Fieldset>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
