import { Chip } from './Chip';

export interface ChipGroupProps {
  options: string[];
  active: number;
  onChange?: (index: number) => void;
  label?: string;
  className?: string;
}

export const ChipGroup = ({
  options,
  active,
  onChange,
  label,
  className,
}: ChipGroupProps) => (
  <div
    role="group"
    aria-label={label}
    className={['flex flex-wrap gap-1.5', className].filter(Boolean).join(' ')}
  >
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
