import { DialogPrimitiveClose } from '@/components/ui/dialog.primitives';
import { Link } from '@/components/ui/Link';

export const MoreItem = ({ to, label }: { to: string; label: string }) => {
  return (
    <li>
      <DialogPrimitiveClose asChild>
        <Link
          to={to}
          className="flex w-full items-center border-b border-rule/60 px-1 py-3 text-[14px] text-ink hover:bg-paper-2"
        >
          {label}
        </Link>
      </DialogPrimitiveClose>
    </li>
  );
};
