// Approach A — "Worlds as Rooms" (Anytype × Discord, literal)
// Left rail of world icons. Each world has a sidebar of objects (notes, drafts,
// lore). Editor is a calm sheet of paper. Cloud/local toggle lives in the title.

function AWorldRail({ active = 1 }) {
  const icons = ['◐', 'Λ', '✦', '◇', '+'];
  return (
    <div style={{
      width: 52, background: '#efece4', borderRight: `1px solid ${WF_LINE_SOFT}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0',
    }}>
      {icons.map((i, idx) => (
        <div key={idx} style={{
          width: 32, height: 32, borderRadius: idx === active ? 8 : 16,
          background: idx === active ? '#fff' : WF_FILL,
          border: `1px solid ${idx === active ? WF_HOT : WF_LINE}`,
          color: idx === active ? WF_HOT : '#888578',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Newsreader, Georgia, serif', fontSize: 16,
        }}>{i}</div>
      ))}
    </div>
  );
}

function ASidebar({ worldName = 'Hollowmere' }) {
  return (
    <div style={{ width: 180, background: '#f6f4ec', borderRight: `1px solid ${WF_LINE_SOFT}`,
                   padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Hand size={18}>{worldName}</Hand>
      <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#9a9789', textTransform: 'uppercase', letterSpacing: 0.5 }}>private · ⇣ local</div>
      <div style={{ height: 1, background: WF_LINE_SOFT, margin: '4px 0' }} />
      {['🜂 Drafts (3)', '◇ Chapters', '∴ Characters', '✦ Places', '✷ Lore', '⌖ Quick capture'].map((s, i) => (
        <div key={i} style={{ fontSize: 12, color: i === 0 ? WF_INK : '#56544d',
                              fontFamily: 'Inter', fontWeight: i === 0 ? 600 : 400 }}>{s}</div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: WF_LINE_SOFT }} />
      <Hand size={11} color="#888578">⏱ sprint · 12:04 left</Hand>
    </div>
  );
}

function AEditor() {
  return (
    <div style={{ flex: 1, background: WF_PAPER, padding: '36px 56px',
                   display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
      <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 24, fontWeight: 500 }}>
        The bell-keeper's last morning
      </div>
      <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9a9789' }}>
        Draft · 1,204 words · saved locally 12s ago
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <Lines count={3} />
        <Lines count={4} last={0.4} />
        <Lines count={2} last={0.7} />
      </div>
      {/* summon-on-demand floating bar */}
      <div style={{
        position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
        background: '#fff', border: `1px solid ${WF_LINE}`, borderRadius: 999,
        padding: '6px 14px', display: 'flex', gap: 12,
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
      }}>
        {['+ note', '+ char', '⌥ link', '↗ publish'].map((s, i) => (
          <Hand key={i} size={12} color="#56544d">{s}</Hand>
        ))}
      </div>
    </div>
  );
}

function A_Writing() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Hollowmere / Bell-keeper · draft"
        statusRight={<Hand size={11} color="#888578" style={{ marginRight: 8 }}>⇣ local · sync off</Hand>}>
        <AWorldRail active={1} />
        <ASidebar />
        <AEditor />
      </WfWindow>
      <Annot top={42} left={-150} arrow="right" width={140}>
        Worlds = stacked spaces. Click an icon, enter that world.
      </Annot>
      <Annot top={350} right={-160} arrow="left" width={150} color={WF_COOL}>
        Cmd-K summons tools — nothing visible until you ask.
      </Annot>
      <Annot top={-30} left={300} arrow="down-left" width={160}>
        Local-first. Toggle cloud per-world in this corner.
      </Annot>
    </div>
  );
}

function A_Notes() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Hollowmere / Lore">
        <AWorldRail active={1} />
        <ASidebar />
        <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Row gap={10}>
            <Hand size={20}>Lore</Hand>
            <Pill cool>linked from 14 drafts</Pill>
            <div style={{ flex: 1 }} />
            <Pill>+ new entry</Pill>
          </Row>
          <Row gap={6}>
            {['all', 'characters', 'places', 'magic', 'timeline'].map((t, i) => (
              <Box key={i} pad="4px 8px" style={{ background: i === 0 ? '#fff' : 'transparent' }}>
                <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>{t}</span>
              </Box>
            ))}
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
            {[
              ['Mira Voss', 'bell-keeper · 34'],
              ['The Tollhouse', 'crossroads, west'],
              ['Hush-bell', 'silences memory'],
              ['Father Ellom', 'priest, missing'],
              ['Vell market', 'every 9th day'],
              ['The Long Quiet', '— year 0 of calendar'],
            ].map(([t, s], i) => (
              <Box key={i} pad={10} style={{ background: '#fff' }}>
                <Hand size={14} style={{ display: 'block', marginBottom: 4 }}>{t}</Hand>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>{s}</div>
                <div style={{ height: 1, background: WF_LINE_SOFT, margin: '8px 0' }} />
                <Lines count={3} last={0.5} />
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={80} right={-150} arrow="left" width={140}>
        Lore = your private wiki. Drag any entry into a draft to link.
      </Annot>
    </div>
  );
}

function A_Feed() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Feed · worlds you follow">
        <AWorldRail active={0} />
        <div style={{ width: 180, background: '#f6f4ec', borderRight: `1px solid ${WF_LINE_SOFT}`,
                       padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Hand size={16}>Following</Hand>
          {['◐ The Lamp Index', 'Λ Saltvane', '✦ Six Doors', '◇ Cinder & Marrow'].map((s, i) => (
            <Row key={i} gap={6} align="center">
              <div style={{ width: 6, height: 6, borderRadius: 6, background: i < 2 ? WF_HOT : WF_LINE }} />
              <div style={{ fontSize: 12 }}>{s}</div>
            </Row>
          ))}
          <div style={{ height: 1, background: WF_LINE_SOFT, margin: '8px 0' }} />
          <Hand size={12} color="#888578">discover →</Hand>
        </div>
        <div style={{ flex: 1, padding: 18, overflow: 'auto' }}>
          <Row gap={10} style={{ marginBottom: 12 }}>
            <Hand size={20}>Today</Hand>
            <div style={{ flex: 1 }} />
            <Pill>latest</Pill><Pill cool>unread (4)</Pill>
          </Row>
          {[
            ['The Lamp Index', '"On the bell-keepers of Hollowmere"', '6 min read · 18m ago'],
            ['Saltvane', '"Field notes: third tide"', '3 min read · 2h ago'],
            ['Six Doors', '"Why I keep two notebooks"', '4 min read · yesterday'],
          ].map(([w, t, m], i) => (
            <Box key={i} pad={12} style={{ marginBottom: 10, background: '#fff' }}>
              <Row gap={8} style={{ marginBottom: 6 }}>
                <Pill hot={i === 0}>{w}</Pill>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>{m}</div>
              </Row>
              <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, marginBottom: 6 }}>{t}</div>
              <Lines count={2} last={0.5} />
            </Box>
          ))}
        </div>
      </WfWindow>
      <Annot top={70} left={-160} arrow="right" width={140} color={WF_COOL}>
        Followers subscribe to a world, not a person.
      </Annot>
    </div>
  );
}

function A_Discover() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Discover · worlds">
        <AWorldRail active={-1} />
        <div style={{ flex: 1, padding: 18 }}>
          <Row gap={10} style={{ marginBottom: 14 }}>
            <Hand size={22}>Find a world to live in</Hand>
          </Row>
          <Row gap={6} style={{ marginBottom: 14 }}>
            {['fiction', 'essays', 'field notes', 'poetry', 'serials', 'worldbuilding'].map((t, i) => (
              <Box key={i} pad="4px 10px" style={{ background: i === 2 ? '#fff' : 'transparent' }}>
                <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>{t}</span>
              </Box>
            ))}
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['◐ The Lamp Index', '1.2k readers · weekly', 'Folk-horror dispatches from a coastal town that never quite was.'],
              ['Λ Saltvane', '430 readers · daily', 'Field notes from a marshland reserve. Mostly birds.'],
              ['✦ Six Doors', '2.4k readers · sporadic', 'Six writers, one shared world. Updated when someone has something true to say.'],
              ['◇ Cinder & Marrow', '88 readers · just started', 'A bone-archivist learning to write again.'],
            ].map(([t, m, b], i) => (
              <Box key={i} pad={12} style={{ background: '#fff' }}>
                <Hand size={16} style={{ display: 'block' }}>{t}</Hand>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6 }}>{m}</div>
                <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 13, color: '#56544d', lineHeight: 1.45 }}>{b}</div>
                <Row gap={6} style={{ marginTop: 10 }}>
                  <Pill cool>follow</Pill>
                  <Pill>peek inside</Pill>
                </Row>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
    </div>
  );
}

Object.assign(window, { A_Writing, A_Notes, A_Feed, A_Discover });
