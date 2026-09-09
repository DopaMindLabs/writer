import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/ui/TextField';
import { Label } from '@/components/ui/Label';
import { eyebrowRecipe } from '@/components/ui/Eyebrow.recipe';
import { cn } from '@/lib/utils';

export interface TemplatesFooterFieldsProps {
  name: string;
  tag: string;
  onNameChange: (value: string) => void;
  onTagChange: (value: string) => void;
}

/** The space name and tag inputs in the New-space footer. */
export const TemplatesFooterFields = ({
  name,
  tag,
  onNameChange,
  onTagChange,
}: TemplatesFooterFieldsProps) => {
  const { t } = useTranslation('screens');
  return (
    <div className="grid grid-cols-[1fr_5.5rem] gap-3 sm:grid-cols-[1fr_8rem] sm:gap-6">
      <div>
        <Label
          htmlFor="space-name"
          tone="ink3"
          weight="regular"
          className={cn(eyebrowRecipe({ tone: 'inherit' }), 'block')}
        >
          {t('templates.nameLabel')}
        </Label>
        <TextField
          id="space-name"
          data-testid="templates-name-input"
          value={name}
          onChange={(e) => { onNameChange(e.target.value); }}
          className="mt-1 h-9 py-0 font-serif text-[18px] leading-none md:h-10 md:text-[22px]"
        />
      </div>
      <div>
        <Label
          htmlFor="space-tag"
          tone="ink3"
          weight="regular"
          className={cn(eyebrowRecipe({ tone: 'inherit' }), 'block')}
        >
          {t('templates.tagLabel')}
        </Label>
        <TextField
          id="space-tag"
          data-testid="templates-tag-input"
          maxLength={3}
          value={tag}
          onChange={(e) => { onTagChange(e.target.value.toUpperCase()); }}
          className="mt-1 h-9 py-0 text-center font-mono text-[16px] leading-none tracking-widest md:h-10 md:text-[18px]"
        />
      </div>
    </div>
  );
};
