import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface MediaPickerTrustPromptProps {
  host: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const MediaPickerTrustPrompt = ({
  host,
  onCancel,
  onConfirm,
}: MediaPickerTrustPromptProps) => (
  <ConfirmDialog
    open={host !== null}
    onOpenChange={(open) => { if (!open) onCancel(); }}
    title={host !== null ? `Trust PDFs from ${host}?` : 'Trust this domain?'}
    description="The app will be allowed to fetch PDFs from this domain. You can remove it later in the media library."
    confirmLabel="Trust & fetch"
    cancelLabel="Cancel"
    onConfirm={onConfirm}
  />
);
