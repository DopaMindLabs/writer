import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from 'react';
import { Search, X } from '@/components/libs/icons';
import { cn } from '@/lib/utils';

export interface SearchFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  clearLabel?: string;
}

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
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const inputTestId = (rest as { 'data-testid'?: string })['data-testid'];
    const clearTestId = inputTestId ? `${inputTestId}-clear` : undefined;

    const showClear =
      !disabled &&
      ((typeof value === 'string' && value.length > 0) ||
        (value === undefined &&
          typeof defaultValue === 'string' &&
          defaultValue.length > 0));

    const handleClear = () => {
      const el = internalRef.current;
      if (el) {
        el.value = '';
        el.focus();
      }
      onClear?.();
    };

    return (
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
          ref={internalRef}
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
          <button
            type="button"
            onClick={handleClear}
            aria-label={clearLabel}
            data-testid={clearTestId}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);
SearchField.displayName = 'SearchField';
