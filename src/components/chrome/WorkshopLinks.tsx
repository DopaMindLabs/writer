import { BrainSpaceLink } from './BrainSpaceLink';
import { MediaLibraryLink } from './MediaLibraryLink';

interface WorkshopLinksProps {
  spaceId: string;
  onBrainSpace: boolean;
  onMediaLibrary: boolean;
  notesCount: number;
}

/**
 * The workshop navigation cluster: the brain-space canvas link and the media
 * library link, rendered together under the Workshop section (and its
 * fallback). Grouping them keeps the two render sites in `Sidebar` in sync.
 */
export const WorkshopLinks = ({
  spaceId,
  onBrainSpace,
  onMediaLibrary,
  notesCount,
}: WorkshopLinksProps) => (
  <>
    <BrainSpaceLink spaceId={spaceId} active={onBrainSpace} count={notesCount} />
    <MediaLibraryLink spaceId={spaceId} active={onMediaLibrary} />
  </>
);
