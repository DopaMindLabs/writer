import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsSectionStack } from './SettingsSectionStack';
import { TabHeader } from './TabHeader';

const DEMO_SECTIONS = [
  { id: 'general', title: 'settings.general.title' },
  { id: 'appearance', title: 'settings.appearance.title' },
  { id: 'typography', title: 'settings.typography.title' },
] as const;

const meta = {
  title: 'Settings/SettingsSectionStack',
  component: SettingsSectionStack,
  parameters: { layout: 'fullscreen' },
  args: { sections: [], scrollTarget: 'general', scrollNonce: 0 },
} satisfies Meta<typeof SettingsSectionStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const Demo = () => {
      const [visible, setVisible] = useState('general');
      const sections = DEMO_SECTIONS.map((section) => ({
        id: section.id,
        node: (
          <section>
            <TabHeader titleKey={section.title} subtitleKey={section.title} />
            <p className="h-64 font-serif text-[14px] text-ink-3">
              Stacked content for {section.id}
            </p>
          </section>
        ),
      }));
      return (
        <div className="flex h-screen flex-col bg-paper text-ink">
          <div className="border-b border-rule px-6 py-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            In view: {visible}
          </div>
          <main className="flex-1 overflow-auto">
            <div className="max-w-[880px] px-12 py-9">
              <SettingsSectionStack
                sections={sections}
                scrollTarget="general"
                scrollNonce={0}
                onVisibleChange={setVisible}
              />
            </div>
          </main>
        </div>
      );
    };
    return <Demo />;
  },
};
