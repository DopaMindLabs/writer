import { TabHeader } from '@/components/settings/TabHeader';
import { useEffectiveEditorTypography } from '@/hooks/useEffectiveEditorTypography';
import { FontRow } from './typography/FontRow';
import { SizeRow } from './typography/SizeRow';
import { FollowA11yRow } from './typography/FollowA11yRow';
import { PreviewBlock } from './typography/PreviewBlock';

export const TypographyTab = () => {
  const typography = useEffectiveEditorTypography();
  return (
    <section>
      <TabHeader
        titleKey="settings.typography.title"
        subtitleKey="settings.typography.subtitle"
      />
      <FontRow />
      <SizeRow />
      <FollowA11yRow />
      <PreviewBlock
        font={typography.font}
        size={typography.size}
        sizeScale={typography.sizeScale}
      />
    </section>
  );
};
