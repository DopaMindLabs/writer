import { Label } from '@/components/ui/Label';
import { eyebrowRecipe } from '@/components/ui/Eyebrow.recipe';
import { cn } from '@/lib/utils';

interface DeleteConfirmFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
}

export const DeleteConfirmField = ({
  label,
  value,
  onChange,
  testId,
}: DeleteConfirmFieldProps) => (
  <Label
    tone="ink3"
    weight="regular"
    className={cn(eyebrowRecipe({ tone: 'inherit' }), 'flex flex-col gap-2')}
  >
    {label}
    <input
      data-testid={testId}
      type="text"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      aria-label={label}
      className="w-full border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-ink"
    />
  </Label>
);
