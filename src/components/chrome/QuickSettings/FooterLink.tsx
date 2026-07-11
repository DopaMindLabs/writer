import { PopoverClose } from '@/components/ui/popover';
import { Link } from '@/components/ui/Link';
import { cn } from '@/lib/utils';

export interface FooterLinkProps {
  to: string;
  label: string;
  kbd?: string;
  testId: string;
  divider?: boolean;
}

export const FooterLink = ({ to, label, kbd, testId, divider }: FooterLinkProps) => (
  <div
    className={cn(
      'flex items-center gap-3 px-4 py-2.5',
      divider && 'border-t border-rule/60',
    )}
  >
    <PopoverClose asChild>
      <Link
        to={to}
        className="inline-flex items-center gap-1 border-b border-ink pb-px text-[12px] font-medium text-ink"
        data-testid={testId}
      >
        {label}
      </Link>
    </PopoverClose>
    <span className="flex-1" />
    {kbd ? <span className="font-mono text-[10px] text-ink-4">{kbd}</span> : null}
  </div>
);
