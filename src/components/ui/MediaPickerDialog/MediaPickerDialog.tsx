import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaPickerLibraryTab } from './MediaPickerLibraryTab';
import { MediaPickerUrlTab } from './MediaPickerUrlTab';
import type { MediaSelection } from './mediaSelection';

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onSelect: (selection: MediaSelection) => void;
}

export const MediaPickerDialog = ({
  open,
  onOpenChange,
  spaceId,
  onSelect,
}: MediaPickerDialogProps) => {
  const select = (selection: MediaSelection) => {
    onSelect(selection);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="media-picker-dialog">
        <DialogHeader>
          <DialogTitle>Add a PDF</DialogTitle>
          <DialogDescription>
            Pick a PDF from your library or paste a link to one.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="library" className="mt-2">
          <TabsList>
            <TabsTrigger value="library" data-testid="media-picker-tab-library">
              From library
            </TabsTrigger>
            <TabsTrigger value="url" data-testid="media-picker-tab-url">
              Paste URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            <MediaPickerLibraryTab
              spaceId={spaceId}
              onSelect={(mediaItemId) => { select({ kind: 'library', mediaItemId }); }}
            />
          </TabsContent>
          <TabsContent value="url">
            <MediaPickerUrlTab
              onSelect={(url) => { select({ kind: 'url', url }); }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
