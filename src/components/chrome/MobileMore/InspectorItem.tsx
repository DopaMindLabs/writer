import { useTranslation } from 'react-i18next';
import { DialogPrimitiveClose } from '@/components/ui/dialog.primitives';
import { useUI } from '@/store/ui';

export const InspectorItem = () => {
  const { t } = useTranslation('chrome');
  const setMobileInspectorOpen = useUI((s) => s.setMobileInspectorOpen);
  return (
    <li>
      <DialogPrimitiveClose asChild>
        {/* @lint-ignore native-button: full-width sheet row matching MoreItem's link treatment; not a DS Button kind */}
        <button
          type="button"
          data-testid="mobile-more-inspector"
          onClick={() => { setMobileInspectorOpen(true); }}
          className="flex w-full items-center border-b border-rule/60 px-1 py-3 text-left text-[14px] text-ink hover:bg-paper-2"
        >
          {t('topbar.inspector')}
        </button>
      </DialogPrimitiveClose>
    </li>
  );
};
