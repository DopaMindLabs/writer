import { Chip } from './Chip';

interface ChipGroupBaseProps {
  label?: string;
  className?: string;
}

/** Legacy index-based API: a flat list of labels selected by position. */
export interface ChipGroupIndexProps extends ChipGroupBaseProps {
  options: string[];
  active: number;
  onChange?: (index: number) => void;
}

export interface ChipGroupOption {
  label: string;
  value: number;
}

/** Value-based API: each chip carries its own value, selected by equality. */
export interface ChipGroupValueProps extends ChipGroupBaseProps {
  options: ChipGroupOption[];
  value: number;
  onChange?: (value: number) => void;
}

export type ChipGroupProps = ChipGroupIndexProps | ChipGroupValueProps;

const isValueMode = (props: ChipGroupProps): props is ChipGroupValueProps =>
  'value' in props;

const wrapperClass = (className?: string): string =>
  ['flex flex-wrap gap-1.5', className].filter(Boolean).join(' ');

export const ChipGroup = (props: ChipGroupProps) => {
  if (isValueMode(props)) {
    const { options, value, onChange, label, className } = props;
    return (
      <div role="group" aria-label={label} className={wrapperClass(className)}>
        {options.map((option) => (
          <Chip
            key={option.value}
            active={option.value === value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  const { options, active, onChange, label, className } = props;
  return (
    <div role="group" aria-label={label} className={wrapperClass(className)}>
      {options.map((option, index) => (
        <Chip
          key={option}
          active={index === active}
          onClick={() => onChange?.(index)}
        >
          {option}
        </Chip>
      ))}
    </div>
  );
};
