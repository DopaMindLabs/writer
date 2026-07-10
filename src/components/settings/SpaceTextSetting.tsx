import { SettingRow } from '@/components/settings/SettingRow';
import { TextField } from '@/components/ui/TextField';

interface SpaceTextSettingProps {
  label: string;
  hint: string;
  ariaLabel: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onReset: () => void;
  inputClassName?: string;
}

export const SpaceTextSetting = ({
  label,
  hint,
  ariaLabel,
  testId,
  value,
  onChange,
  onCommit,
  onReset,
  inputClassName,
}: SpaceTextSettingProps) => (
  <SettingRow label={label} hint={hint}>
    <TextField
      data-testid={testId}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') onReset();
      }}
      aria-label={ariaLabel}
      className={inputClassName}
    />
  </SettingRow>
);
