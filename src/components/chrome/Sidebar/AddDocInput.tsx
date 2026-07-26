import { forwardRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/ui/TextField';
import { cn } from '@/lib/utils';

interface AddDocInputProps {
  sectionId: string;
  value: string;
  indented?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export const AddDocInput = forwardRef<HTMLInputElement, AddDocInputProps>(
  ({ sectionId, value, indented = false, onChange, onKeyDown, onBlur }, ref) => {
    const { t } = useTranslation('chrome');
    return (
      <div
        className={cn(
          '-ml-px flex items-center gap-2 border-l-2 border-ink py-1',
          indented ? 'pl-7 pr-3' : 'px-5',
        )}
      >
        <TextField
          ref={ref}
          variant="bare"
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={t('sidebar.docNamePlaceholder')}
          aria-label={t('sidebar.addDocInputAria')}
          data-testid={`sidebar-section-${sectionId}-add-input`}
          className="flex-1 text-[13px]"
        />
      </div>
    );
  },
);
AddDocInput.displayName = 'AddDocInput';
