// Main entry — assembles the four approaches into a DesignCanvas with Tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "annotations": true,
  "roughness": 0.5,
  "metaphor": "all",
  "paper": "light"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Expose tweaks to the wireframe primitives that read them at render-time.
  window.__wfAnnotations = t.annotations;
  window.__wfRoughness = t.roughness;

  // Paper tone tweak
  React.useEffect(() => {
    document.body.style.background = t.paper === 'dark' ? '#2a2825' : '#f4f3ef';
  }, [t.paper]);

  const showApproach = (key) => t.metaphor === 'all' || t.metaphor === key;

  return (
    <>
      <DesignCanvas>
        {/* intro section */}
        <DCSection id="intro" title="Writing app · 4 directions"
                    subtitle="Light-grey wireframes. Toggle annotations and switch metaphors in Tweaks (top-right).">
          <DCArtboard id="brief" label="brief & system" width={680} height={500}>
            <Brief />
          </DCArtboard>
        </DCSection>

        {showApproach('rooms') && (
          <DCSection id="rooms" title="A · Worlds as Rooms"
                      subtitle="Anytype × Discord. Vertical world-rail; each world is a sidebar of objects + a writing sheet.">
            <DCArtboard id="a-write" label="A.1 · Writing" width={820} height={560}><CenterFrame><A_Writing /></CenterFrame></DCArtboard>
            <DCArtboard id="a-notes" label="A.2 · Notes & Lore" width={820} height={560}><CenterFrame><A_Notes /></CenterFrame></DCArtboard>
            <DCArtboard id="a-feed" label="A.3 · Social Feed" width={820} height={560}><CenterFrame><A_Feed /></CenterFrame></DCArtboard>
            <DCArtboard id="a-disc" label="A.4 · Discover" width={820} height={560}><CenterFrame><A_Discover /></CenterFrame></DCArtboard>
          </DCSection>
        )}

        {showApproach('stage') && (
          <DCSection id="stage" title="B · Stage & Audience"
                      subtitle="Private studio and public stage are spatially separate. You cross a seam to publish.">
            <DCArtboard id="b-write" label="B.1 · Stage (writing)" width={820} height={560}><CenterFrame><B_Writing /></CenterFrame></DCArtboard>
            <DCArtboard id="b-notes" label="B.2 · Backroom (notes/inbox)" width={820} height={560}><CenterFrame><B_Notes /></CenterFrame></DCArtboard>
            <DCArtboard id="b-feed" label="B.3 · Audience (feed)" width={820} height={560}><CenterFrame><B_Feed /></CenterFrame></DCArtboard>
            <DCArtboard id="b-disc" label="B.4 · Discover" width={820} height={560}><CenterFrame><B_Discover /></CenterFrame></DCArtboard>
          </DCSection>
        )}

        {showApproach('garden') && (
          <DCSection id="garden" title="C · Garden / Canvas"
                      subtitle="A world is a 2-D garden of nodes — people, places, lore, drafts. Editor lives inside a node.">
            <DCArtboard id="c-write" label="C.1 · Garden (writing in a node)" width={820} height={560}><CenterFrame><C_Writing /></CenterFrame></DCArtboard>
            <DCArtboard id="c-notes" label="C.2 · Garden (zoomed clusters)" width={820} height={560}><CenterFrame><C_Notes /></CenterFrame></DCArtboard>
            <DCArtboard id="c-feed" label="C.3 · Feed (gardens you tend & visit)" width={820} height={560}><CenterFrame><C_Feed /></CenterFrame></DCArtboard>
            <DCArtboard id="c-disc" label="C.4 · Discover gardens" width={820} height={560}><CenterFrame><C_Discover /></CenterFrame></DCArtboard>
          </DCSection>
        )}

        {showApproach('river') && (
          <DCSection id="river" title="D · River"
                      subtitle="Everything is chronological. Captures, drafts, publishes flow through one stream.">
            <DCArtboard id="d-write" label="D.1 · The river (writing)" width={820} height={560}><CenterFrame><D_Writing /></CenterFrame></DCArtboard>
            <DCArtboard id="d-notes" label="D.2 · Upstream (notes)" width={820} height={560}><CenterFrame><D_Notes /></CenterFrame></DCArtboard>
            <DCArtboard id="d-feed" label="D.3 · Downstream (feed)" width={820} height={560}><CenterFrame><D_Feed /></CenterFrame></DCArtboard>
            <DCArtboard id="d-disc" label="D.4 · Discover rivers" width={820} height={560}><CenterFrame><D_Discover /></CenterFrame></DCArtboard>
          </DCSection>
        )}
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="View" />
        <TweakToggle label="Annotations" value={t.annotations}
                     onChange={(v) => setTweak('annotations', v)} />
        <TweakSlider label="Sketch roughness" value={t.roughness} min={0} max={1} step={0.05}
                     onChange={(v) => setTweak('roughness', v)} />
        <TweakSection label="Approach" />
        <TweakSelect label="Metaphor" value={t.metaphor}
                     options={[
                       { value: 'all',    label: 'show all four' },
                       { value: 'rooms',  label: 'A · Worlds as Rooms' },
                       { value: 'stage',  label: 'B · Stage & Audience' },
                       { value: 'garden', label: 'C · Garden / Canvas' },
                       { value: 'river',  label: 'D · River' },
                     ]}
                     onChange={(v) => setTweak('metaphor', v)} />
        <TweakSection label="Paper" />
        <TweakRadio label="Tone" value={t.paper}
                    options={['light', 'dark']}
                    onChange={(v) => setTweak('paper', v)} />
      </TweaksPanel>
    </>
  );
}

// Center the WfWindow inside its (slightly larger) artboard so the
// hand-drawn annotations bleeding outside the window stay visible.
function CenterFrame({ children }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  );
}

function Brief() {
  return (
    <div style={{ padding: 30, fontFamily: 'Newsreader, Georgia, serif',
                   color: '#2a2a28', lineHeight: 1.55, fontSize: 14,
                   width: '100%', height: '100%', overflow: 'auto',
                   background: WF_PAPER }}>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: 32, marginBottom: 6 }}>
        a writing app — wireframes
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888578',
                     letterSpacing: 0.6, marginBottom: 18 }}>
        DESKTOP · OFFLINE-FIRST · WRITER'S WORLD · MINIMAL BRANDING
      </div>
      <p style={{ margin: '0 0 10px' }}>
        Four different ways to think about the same app: a focused writing surface
        with private notes, world-building, and a Substack-like social layer where
        followers subscribe to a <i>world</i>, not just a person.
      </p>
      <p style={{ margin: '0 0 16px' }}>
        Each direction shows four screens — <b>writing</b>, <b>notes &amp; lore</b>,
        <b> feed</b>, <b>discover</b>. The art is intentionally rough: structure and
        flow first, polish later. Use the Tweaks panel to swap metaphor, hide
        annotations, or slide between clean and scribbly.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
        {[
          ['A · Rooms', 'Anytype-style: vertical rail of worlds; each world is a sidebar of objects + a sheet of paper. Familiar; closest to what you described.'],
          ['B · Stage & Audience', 'Spatial separation between private studio and public stage. Publishing is a physical gesture. Strong ADHD argument: the audience literally can\'t enter the writing room.'],
          ['C · Garden / Canvas', 'A world is a 2-D garden of nodes. Worldbuilders love this; risk is the canvas becomes the procrastination.'],
          ['D · River', 'Everything chronological. Captures, drafts, publishes flow in one stream. Friendliest to ADHD: no folders to maintain.'],
        ].map(([t, d], i) => (
          <div key={i} style={{ padding: 10, background: '#fffdf3',
                                  border: `1px dashed ${WF_LINE}`, borderRadius: 6 }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18 }}>{t}</div>
            <div style={{ fontSize: 12, color: '#56544d', marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: '#888578',
                     fontFamily: 'IBM Plex Mono, monospace' }}>
        next: pick a direction; I'll deepen it (real states, transitions, prototype).
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
