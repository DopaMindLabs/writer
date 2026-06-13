import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button, type ButtonKind } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmKind?: ButtonKind;
  onConfirm: () => void;
}

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmKind = 'primary',
  onConfirm,
}: ConfirmDialogProps) => {
  const handleConfirm = (): void => {
    onConfirm();
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="confirm-dialog"
        className="max-w-sm"
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <DialogClose asChild>
            <Button kind="secondary" size="sm" data-testid="confirm-dialog-cancel">
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            kind={confirmKind}
            size="sm"
            data-testid="confirm-dialog-confirm"
            autoFocus
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
