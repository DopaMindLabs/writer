import { TabHeader } from '@/components/settings/TabHeader';
import { useUI } from '@/store/ui';
import { FontRow } from './typography/FontRow';
import { SizeRow } from './typography/SizeRow';
import { PreviewBlock } from './typography/PreviewBlock';

export const TypographyTab = () => {
  const editorFont = useUI((s) => s.editorFont);
  const editorSize = useUI((s) => s.editorSize);
  return (
    <section>
      <TabHeader
        titleKey="settings.typography.title"
        subtitleKey="settings.typography.subtitle"
      />
      <FontRow />
      <SizeRow />
      <PreviewBlock font={editorFont} size={editorSize} />
    </section>
  );
};
