// Approach C — "Garden / Canvas" (spatial worldbuilding, free-form)
// The world is a 2-D canvas. Notes, characters, drafts are objects you arrange.
// Writing happens inside a "page" object you double-click open.

function C_Writing() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Hollowmere · garden">
        <div style={{ flex: 1, position: 'relative',
                       background: `${WF_PAPER} radial-gradient(#e8e4d8 1px, transparent 1px) 0 0 / 18px 18px` }}>
          {/* canvas nodes */}
          {[
            { l: 30, t: 26, w: 130, h: 70, label: '✦ Hollowmere', kind: 'place', big: true },
            { l: 180, t: 70, w: 110, h: 60, label: '∴ Mira Voss', kind: 'character' },
            { l: 300, t: 30, w: 130, h: 70, label: '✷ The Long Quiet', kind: 'lore' },
            { l: 470, t: 80, w: 120, h: 60, label: '⌖ Quick capture', kind: 'inbox', count: 23 },
            { l: 60, t: 160, w: 150, h: 110, label: '◇ Bell-keeper draft', kind: 'draft', open: true },
            { l: 240, t: 200, w: 130, h: 70, label: '∴ Father Ellom', kind: 'character' },
            { l: 410, t: 230, w: 160, h: 70, label: '✦ The Tollhouse', kind: 'place' },
            { l: 600, t: 200, w: 100, h: 60, label: '◇ scrap: opening line', kind: 'draft' },
          ].map((n, i) => (
            <CardNode key={i} {...n} />
          ))}
          {/* draft-open inspector */}
          <div style={{
            position: 'absolute', right: 12, top: 12, width: 240, bottom: 12,
            background: '#fff', border: `1px solid ${WF_LINE}`, borderRadius: 8,
            padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
          }}>
            <Row>
              <Hand size={14}>◇ Bell-keeper draft</Hand>
              <div style={{ flex: 1 }} />
              <Hand size={10} color="#888578">⤢</Hand>
            </Row>
            <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#888578' }}>
              linked to: Mira · Hollowmere · The Long Quiet
            </div>
            <div style={{ height: 1, background: WF_LINE_SOFT, margin: '4px 0' }} />
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 13, fontWeight: 500 }}>
              The bell-keeper's last morning
            </div>
            <Lines count={6} last={0.5} />
            <Lines count={3} last={0.7} />
            <div style={{ flex: 1 }} />
            <Hand size={11} color="#888578">⇣ local · drag to ↗ publish</Hand>
          </div>
          {/* mini toolbar */}
          <div style={{
            position: 'absolute', left: 12, bottom: 12,
            background: '#fff', border: `1px solid ${WF_LINE}`, borderRadius: 999,
            padding: '6px 12px', display: 'flex', gap: 10,
          }}>
            {['+ note', '+ person', '+ place', '+ draft', '⌥ link'].map((s, i) => (
              <Hand key={i} size={11} color="#56544d">{s}</Hand>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={20} left={-160} arrow="right" width={150}>
        Spatial worldbuilding. No folders — proximity = meaning.
      </Annot>
      <Annot top={290} right={-170} arrow="left" width={160} color={WF_COOL}>
        Double-click a draft to open inspector. Editor lives <i>inside</i> the world.
      </Annot>
    </div>
  );
}

function CardNode({ l, t, w, h, label, kind, big, open, count }) {
  const kindColor = {
    place: '#7b6a4a', character: '#5b6f55', lore: '#7a4f6e',
    draft: WF_HOT, inbox: '#a06a3a',
  }[kind] || WF_INK;
  return (
    <div style={{
      position: 'absolute', left: l, top: t, width: w, height: h,
      background: open ? '#fff' : WF_PAPER, borderRadius: 8,
      border: `1px ${open ? 'solid' : 'solid'} ${open ? WF_HOT : WF_LINE}`,
      boxShadow: open ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
      padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                     color: kindColor, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {kind}{count !== undefined ? ` · ${count}` : ''}
      </div>
      <Hand size={big ? 16 : 13}>{label}</Hand>
      {h > 70 && (
        <>
          <div style={{ height: 1, background: WF_LINE_SOFT, marginTop: 4 }} />
          <Lines count={2} color={WF_LINE_SOFT} last={0.5} />
        </>
      )}
    </div>
  );
}

function C_Notes() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Hollowmere · garden · zoomed">
        <div style={{ flex: 1, position: 'relative',
                       background: `${WF_PAPER} radial-gradient(#e8e4d8 1px, transparent 1px) 0 0 / 22px 22px` }}>
          {/* clusters */}
          <Cluster left={30} top={30} title="People" color="#5b6f55">
            {['Mira Voss', 'Father Ellom', 'a child collecting silences', 'the salt-priest', 'the unnamed twin'].map((n, i) => (
              <Hand key={i} size={13} style={{ display: 'block', margin: '4px 0' }}>∴ {n}</Hand>
            ))}
          </Cluster>
          <Cluster left={250} top={30} title="Places" color="#7b6a4a">
            {['Hollowmere', 'The Tollhouse', 'Vell market', 'the second sluice', 'the bell-tower'].map((n, i) => (
              <Hand key={i} size={13} style={{ display: 'block', margin: '4px 0' }}>✦ {n}</Hand>
            ))}
          </Cluster>
          <Cluster left={470} top={30} title="Lore" color="#7a4f6e">
            {['The Long Quiet', 'The hush-bell', '13 months, one nameless', 'why salt is holy here', 'the priest\'s coat smells of pepper'].map((n, i) => (
              <Hand key={i} size={13} style={{ display: 'block', margin: '4px 0' }}>✷ {n}</Hand>
            ))}
          </Cluster>
          <Cluster left={140} top={260} title="Drafts" color={WF_HOT} wide>
            {['Bell-keeper draft', 'scrap: opening line', 'untitled (yesterday)', 'letter to a future reader'].map((n, i) => (
              <Hand key={i} size={13} style={{ display: 'block', margin: '4px 0' }}>◇ {n}</Hand>
            ))}
          </Cluster>
          {/* connecting strokes */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <path d="M 130 100 C 200 130, 260 130, 320 130" stroke={WF_LINE} fill="none" strokeDasharray="3 3" />
            <path d="M 350 110 C 400 150, 320 230, 240 270" stroke={WF_LINE} fill="none" strokeDasharray="3 3" />
            <path d="M 550 110 C 540 180, 380 260, 260 290" stroke={WF_LINE} fill="none" strokeDasharray="3 3" />
          </svg>
        </div>
      </WfWindow>
      <Annot top={20} right={-160} arrow="left" width={150}>
        Same world, zoomed. Clusters are just visual groupings — drag to rearrange.
      </Annot>
    </div>
  );
}

function Cluster({ left, top, title, color, wide, children }) {
  return (
    <div style={{
      position: 'absolute', left, top, width: wide ? 380 : 200,
      background: '#fff', border: `1px solid ${WF_LINE}`, borderRadius: 10, padding: 10,
    }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
        color, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4,
      }}>{title}</div>
      {children}
    </div>
  );
}

function C_Feed() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Worlds · feed">
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: 200, background: '#f6f4ec', padding: 14,
                          borderRight: `1px solid ${WF_LINE_SOFT}` }}>
            <Hand size={14} color="#888578">your gardens</Hand>
            <div style={{ height: 8 }} />
            {[['Hollowmere', true], ['the salt letters', false], ['scrapbook', false]].map(([s, on], i) => (
              <Row key={i} style={{ padding: '4px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: 8, background: on ? WF_HOT : WF_LINE, marginRight: 6 }} />
                <Hand size={12}>{s}</Hand>
              </Row>
            ))}
            <div style={{ height: 14 }} />
            <Hand size={14} color="#888578">following</Hand>
            <div style={{ height: 8 }} />
            {['The Lamp Index', 'Saltvane', 'Six Doors'].map((s, i) => (
              <div key={i} style={{ fontSize: 12, padding: '4px 0', color: '#56544d' }}>{s}</div>
            ))}
          </div>
          <div style={{ flex: 1, padding: 18, overflow: 'auto' }}>
            <Hand size={20} style={{ display: 'block', marginBottom: 10 }}>
              From the gardens you tend & visit
            </Hand>
            {[
              ['Hollowmere', 'YOU · 3d ago', 'On the bell-keepers', 'a folk-horror sketch', '4 reads · 1 reply'],
              ['The Lamp Index', 'R. Maren · 18m', 'Tide notes, third', 'brackish at the sluice today', '— · — '],
              ['Six Doors', 'shared · 2h', 'Why I keep two notebooks', 'one for what is, one for what could', '12 reads · 3 replies'],
            ].map(([w, who, title, lead, m], i) => (
              <Box key={i} pad={12} style={{ marginBottom: 10, background: '#fff' }}>
                <Row gap={8} style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 0.6,
                                   color: i === 0 ? WF_HOT : '#888578', textTransform: 'uppercase' }}>{w}</div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#9a9789' }}>· {who}</div>
                </Row>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 16, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#56544d', fontFamily: 'Newsreader, serif', fontStyle: 'italic', marginBottom: 6 }}>{lead}</div>
                <div style={{ fontSize: 10, color: '#9a9789', fontFamily: 'IBM Plex Mono, monospace' }}>{m}</div>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={30} left={-160} arrow="right" width={150}>
        Same sidebar mixes your own gardens with ones you visit.
      </Annot>
    </div>
  );
}

function C_Discover() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Discover · gardens">
        <div style={{ flex: 1, padding: 22 }}>
          <Row style={{ marginBottom: 14 }}>
            <Hand size={22}>Gardens you might visit</Hand>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              ['◐ The Lamp Index', '4 places · 18 lore', 'folk-horror'],
              ['Λ Saltvane', '7 places · 41 field notes', 'naturalist'],
              ['✦ Six Doors', 'shared · 6 writers', 'collab fiction'],
              ['◇ Cinder & Marrow', '3 people · 2 places', 'memoir'],
              ['✷ a salt letter', '1 long thread', 'epistolary'],
              ['⌖ the unsaid', 'inbox-only', 'experiment'],
            ].map(([t, m, kind], i) => (
              <Box key={i} pad={12} style={{ background: '#fff' }}>
                <Hand size={15}>{t}</Hand>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{m}</div>
                <Pill cool style={{ marginTop: 8 }}>{kind}</Pill>
                <Lines count={2} last={0.6} color={WF_LINE_SOFT} />
                <Row gap={6} style={{ marginTop: 8 }}>
                  <Pill>peek</Pill><Pill hot>follow</Pill>
                </Row>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
    </div>
  );
}

Object.assign(window, { C_Writing, C_Notes, C_Feed, C_Discover });
