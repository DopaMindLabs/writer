import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon';
import { MoreHorizontal } from '@/components/libs/icons';
import { routes } from '@/lib/routes';

interface PdfReaderOverflowMenuProps {
  spaceId: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

/**
 * The rail's ⋯ overflow: where zoom lives now that the standing toolbar is gone
 * (the D1 repair), plus a jump back to the library. It never carries a show/hide
 * action — panel and rail visibility belong to the rail glyphs and the topbar.
 */
export const PdfReaderOverflowMenu = ({
  spaceId,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: PdfReaderOverflowMenuProps) => {
  const { t } = useTranslation('screens');
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          icon={MoreHorizontal}
          label={t('pdfReader.overflow')}
          data-testid="pdf-rail-overflow"
          className="h-8 w-8"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="end">
        <DropdownMenuItem disabled={!canZoomIn} onSelect={onZoomIn}>
          {t('pdfReader.menu.zoomIn')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canZoomOut} onSelect={onZoomOut}>
          {t('pdfReader.menu.zoomOut')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onResetZoom}>
          {t('pdfReader.menu.resetZoom')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void navigate(routes.mediaLibrary(spaceId));
          }}
        >
          {t('pdfReader.menu.openLibrary')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
