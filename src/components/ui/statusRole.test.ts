import { AlertTriangle, Check, Info, X } from '@/components/libs/icons';
import { STATUS_ICON } from './statusRole';

describe('STATUS_ICON', () => {
  it('maps each role to its §5 icon', () => {
    expect(STATUS_ICON.error).toBe(X);
    expect(STATUS_ICON.warning).toBe(AlertTriangle);
    expect(STATUS_ICON.success).toBe(Check);
    expect(STATUS_ICON.info).toBe(Info);
  });
});
