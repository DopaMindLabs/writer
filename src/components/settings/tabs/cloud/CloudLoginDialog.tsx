import { Dialog } from '@/components/ui/dialog';
import type { DXCUserInteraction } from '@/lib/cloud/cloudClient';
import { CloudLoginContent } from './CloudLoginContent';

export interface CloudLoginDialogProps {
  interaction: DXCUserInteraction | null;
}

/**
 * Renders whatever sign-in step the addon is asking for
 * (`db.cloud.userInteraction`). Purely driven by the injected interaction, so it
 * never touches the addon; renders nothing when there is no active interaction.
 */
export const CloudLoginDialog = ({ interaction }: CloudLoginDialogProps) => (
  <Dialog
    open={interaction !== null}
    onOpenChange={(next) => {
      if (!next) interaction?.onCancel();
    }}
  >
    {interaction ? <CloudLoginContent interaction={interaction} /> : null}
  </Dialog>
);
