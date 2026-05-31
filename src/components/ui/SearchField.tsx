import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';
import { Search, X } from '@/components/libs/icons';
import { invariant } from '@/lib/invariant';
import { cn } from '@/lib/utils';

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  clearLabel?: string;
}

interface ClearButtonProps {
  onClear: () => void;
  clearLabel: string;
  clearTestId?: string;
}

const ClearButton = ({ onClear, clearLabel, clearTestId }: ClearButtonProps) => (
  <button
    type="button"
    onClick={onClear}
    aria-label={clearLabel}
    data-testid={clearTestId}
    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
  >
    <X className="h-3 w-3" aria-hidden />
  </button>
);

interface SearchFieldViewProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
  value?: InputHTMLAttributes<HTMLInputElement>['value'];
  defaultValue?: InputHTMLAttributes<HTMLInputElement>['defaultValue'];
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  showClear: boolean;
  onClear: () => void;
  clearLabel: string;
  clearTestId?: string;
  rest: InputHTMLAttributes<HTMLInputElement>;
}

const SearchFieldView = ({
  inputRef,
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder,
  showClear,
  onClear,
  clearLabel,
  clearTestId,
  rest,
}: SearchFieldViewProps) => (
  <div
    className={cn(
      'group flex w-full items-center gap-2 border-b border-rule transition-colors focus-within:border-ink',
      disabled && 'bg-paper-2',
      className,
    )}
  >
    <Search
      className={cn(
        'h-3.5 w-3.5 shrink-0',
        disabled ? 'text-ink-4' : 'text-ink-3',
      )}
      aria-hidden
    />
    <input
      ref={inputRef}
      type="search"
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'block w-full border-0 bg-transparent px-0 py-1.5 font-sans text-[14px] leading-tight text-ink outline-none placeholder:text-ink-4 disabled:cursor-not-allowed disabled:text-ink-4',
        '[&::-webkit-search-cancel-button]:appearance-none',
      )}
      {...rest}
    />
    {showClear ? (
      <ClearButton
        onClear={onClear}
        clearLabel={clearLabel}
        clearTestId={clearTestId}
      />
    ) : null}
  </div>
);

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      className,
      value,
      defaultValue,
      onChange,
      onClear,
      clearLabel = 'Clear search',
      disabled,
      placeholder = 'search…',
      ...rest
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => {
      invariant(internalRef.current, 'SearchField input ref not attached');
      return internalRef.current;
    });

    const inputTestId = (rest as { 'data-testid'?: string })['data-testid'];
    const clearTestId = inputTestId ? `${inputTestId}-clear` : undefined;

    const isControlled = value !== undefined;
    const [uncontrolledEmpty, setUncontrolledEmpty] = useState(
      () => !(typeof defaultValue === 'string' && defaultValue.length > 0),
    );

    const isEmpty = isControlled
      ? !(typeof value === 'string' && value.length > 0)
      : uncontrolledEmpty;

    const showClear = !disabled && !isEmpty;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setUncontrolledEmpty(e.target.value.length === 0);
      onChange?.(e);
    };

    const handleClear = () => {
      const el = internalRef.current;
      if (el) {
        el.value = '';
        el.focus();
      }
      if (!isControlled) setUncontrolledEmpty(true);
      onClear?.();
    };

    return (
      <SearchFieldView
        inputRef={internalRef}
        className={className}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        showClear={showClear}
        onClear={handleClear}
        clearLabel={clearLabel}
        clearTestId={clearTestId}
        rest={rest}
      />
    );
  },
);
SearchField.displayName = 'SearchField';
