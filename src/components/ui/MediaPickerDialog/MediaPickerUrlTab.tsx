import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { MediaPickerTrustPrompt } from './MediaPickerTrustPrompt';
import { useUrlPicker } from './useUrlPicker';

interface MediaPickerUrlTabProps {
  onSelect: (url: string) => void;
}

export const MediaPickerUrlTab = ({ onSelect }: MediaPickerUrlTabProps) => {
  const picker = useUrlPicker(onSelect);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void picker.submit(); }}
      className="flex flex-col gap-2"
      data-testid="media-picker-url-form"
    >
      <label
        htmlFor="media-picker-url"
        className="font-mono text-[9px] uppercase tracking-wider text-ink-3"
      >
        PDF URL
      </label>
      <div className="flex items-center gap-2">
        <TextField
          id="media-picker-url"
          value={picker.url}
          onChange={(e) => { picker.setUrl(e.target.value); }}
          placeholder="https://arxiv.org/pdf/…"
          aria-invalid={picker.error !== null}
          aria-describedby={
            picker.error !== null ? 'media-picker-url-error' : undefined
          }
          data-testid="media-picker-url-field"
        />
        <Button
          type="submit"
          kind="primary"
          size="sm"
          disabled={picker.url.trim().length === 0}
          data-testid="media-picker-url-submit"
        >
          Select
        </Button>
      </div>
      {picker.error !== null ? (
        <span
          id="media-picker-url-error"
          role="alert"
          className="font-sans text-[12px] text-danger"
        >
          {picker.error}
        </span>
      ) : null}
      <MediaPickerTrustPrompt
        host={picker.pendingHost}
        onCancel={picker.cancelTrust}
        onConfirm={picker.confirmTrust}
      />
    </form>
  );
};
