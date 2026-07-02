import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { PRESENCE_HUES, type PresenceHue } from '@/lib/account/profile';

interface PresenceHuePickerProps {
  value: PresenceHue;
  onChange: (hue: PresenceHue) => void;
  label: string;
}

// Static map so Tailwind keeps each utility (dynamic `bg-presence-${n}` would be purged).
const HUE_CLASS: Record<PresenceHue, string> = {
  'presence-1': 'bg-presence-1',
  'presence-2': 'bg-presence-2',
  'presence-3': 'bg-presence-3',
  'presence-4': 'bg-presence-4',
  'presence-5': 'bg-presence-5',
};

/** A colour swatch per presence hue; the selected one is ringed. Reports the chosen key. */
export const PresenceHuePicker = ({
  value,
  onChange,
  label,
}: PresenceHuePickerProps) => {
  const { t } = useTranslation('screens');
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {PRESENCE_HUES.map((hue) => {
        const name = t(`settings.account.hues.${hue}`);
        const selected = hue === value;
        return (
          <button
            key={hue}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => {
              onChange(hue);
            }}
            className={cn(
              'h-6 w-6 ring-offset-2 ring-offset-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
              HUE_CLASS[hue],
              selected ? 'ring-2 ring-ink' : 'ring-1 ring-rule',
            )}
          />
        );
      })}
    </div>
  );
};
