import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundScreen() {
  return (
    <div className="flex h-full items-center justify-center text-ink">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-3">404</p>
        <h1 className="mt-2 font-serif text-3xl">Lost in the margins</h1>
        <p className="mt-2 text-sm text-ink-3">
          That page doesn't exist (yet).
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
