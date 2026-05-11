// Approach D — "River" (chronological stream; inbox → drafts → published)
// Everything is time. Yesterday is up, tomorrow is down. Writing happens in a
// single column. Publishing is a sideways gesture into the public column.

function D_Writing() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · the river">
        <div style={{ flex: 1, display: 'flex' }}>
          {/* time gutter */}
          <div style={{ width: 60, background: '#f4f1e8', borderRight: `1px solid ${WF_LINE_SOFT}`,
                          padding: '14px 4px', display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
            {['SUN', 'TUE', 'WED', 'FRI', 'TODAY', 'TMRW'].map((d, i) => (
              <div key={i} style={{
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                color: i === 4 ? WF_HOT : '#9a9789', letterSpacing: 0.6,
                fontWeight: i === 4 ? 700 : 400,
              }}>{d}</div>
            ))}
          </div>
          {/* river column */}
          <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12,
                         overflow: 'auto', background: WF_PAPER }}>
            <Box pad={10} style={{ background: '#fffdf3', borderColor: '#e4dfc4' }}>
              <Hand size={11} color="#888578">SUN · captured</Hand>
              <Hand size={14} style={{ display: 'block' }}>bell-keeper rings on the wrong morning</Hand>
            </Box>
            <Box pad={10} style={{ background: '#fff' }}>
              <Row><Hand size={11} color="#888578">TUE · draft started</Hand><div style={{ flex: 1 }} /><Pill hot>published wed</Pill></Row>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15, marginTop: 4 }}>The bell-keeper's last morning</div>
              <Lines count={2} last={0.5} />
            </Box>
            <Box pad={10} style={{ background: '#fffdf3', borderColor: '#e4dfc4' }}>
              <Hand size={11} color="#888578">FRI · captured</Hand>
              <Hand size={14} style={{ display: 'block' }}>character: a child who collects silences</Hand>
            </Box>
            {/* TODAY focus card */}
            <Box pad={14} style={{ background: '#fff', borderColor: WF_HOT, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <Row>
                <Hand size={12} color={WF_HOT}>TODAY · writing</Hand>
                <div style={{ flex: 1 }} />
                <Hand size={11} color="#888578">⏱ 22:14 left in sprint</Hand>
              </Row>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, marginTop: 6, marginBottom: 8 }}>
                Notes on the bell-keeper, pt 2
              </div>
              <Lines count={4} />
              <Lines count={3} last={0.4} />
              <Row gap={6} style={{ marginTop: 10 }}>
                <Pill>+ quick capture</Pill>
                <Pill cool>⇣ local</Pill>
                <Pill hot>↗ publish</Pill>
              </Row>
            </Box>
            <Box pad={10} dashed style={{ borderColor: WF_LINE }}>
              <Hand size={11} color="#9a9789">TMRW · placeholder</Hand>
              <Hand size={13} color="#9a9789" style={{ display: 'block' }}>nothing yet · drop something here</Hand>
            </Box>
          </div>
          {/* publish lane (faint) */}
          <div style={{ width: 150, borderLeft: `1px dashed ${WF_LINE}`,
                          background: '#f4f1e8', padding: 12 }}>
            <Hand size={12} color="#888578">published →</Hand>
            <div style={{ height: 10 }} />
            {['Tide notes, third', 'On the bell-keepers', 'Why two notebooks'].map((s, i) => (
              <Box key={i} pad={6} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: '#9a9789', fontFamily: 'IBM Plex Mono, monospace' }}>{['2h', 'WED', '12d'][i]}</div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 11 }}>{s}</div>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={20} left={-150} arrow="right" width={140}>
        Time is the only structure. Up = past, down = future.
      </Annot>
      <Annot top={300} right={-150} arrow="left" width={140} color={WF_COOL}>
        Streak = consecutive days with a card. Subtle, no shame.
      </Annot>
    </div>
  );
}

function D_Notes() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · upstream (notes & lore)">
        <div style={{ flex: 1, padding: 18, display: 'flex', flexDirection: 'column' }}>
          <Row style={{ marginBottom: 12 }}>
            <Hand size={22}>Upstream</Hand>
            <span style={{ width: 8 }} />
            <Hand size={12} color="#888578">— everything that has fed the river</Hand>
            <div style={{ flex: 1 }} />
            <Pill>filter ▾</Pill>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', columnGap: 14, rowGap: 10 }}>
            {[
              ['THIS WK', 'NOTE', 'bell-keeper rings on the wrong morning', '→ became a published piece'],
              ['THIS WK', 'CHAR', 'a child who collects silences', 'unused'],
              ['LAST WK', 'PLACE', 'the second sluice', 'linked from 2 drafts'],
              ['LAST WK', 'LORE', 'why salt is holy here', 'unused'],
              ['MAY', 'NOTE', 'the priest\'s coat smells of pepper', 'linked'],
              ['MAY', 'LORE', '13 months, one nameless', 'linked from 4'],
              ['APR', 'CHAR', 'the unnamed twin', 'unused'],
            ].map(([t, k, n, m], i) => (
              <React.Fragment key={i}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#9a9789', paddingTop: 4 }}>{t}</div>
                <Box pad={10} style={{ background: '#fff' }}>
                  <Row>
                    <Pill cool={k === 'CHAR'} hot={k === 'NOTE'} style={{ marginRight: 8 }}>{k.toLowerCase()}</Pill>
                    <Hand size={13}>{n}</Hand>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 10, color: '#9a9789', fontFamily: 'IBM Plex Mono, monospace' }}>{m}</div>
                  </Row>
                </Box>
              </React.Fragment>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={20} right={-160} arrow="left" width={150}>
        Notes are just earlier river cards. No separate database — same stream, filtered.
      </Annot>
    </div>
  );
}

function D_Feed() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Downstream · what readers see">
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: 64, background: '#f4f1e8', padding: '14px 6px',
                          borderRight: `1px solid ${WF_LINE_SOFT}`, display: 'flex',
                          flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Hand size={10} color="#888578">↑ past</Hand>
            <div style={{ width: 2, flex: 1, background: WF_LINE_SOFT }} />
            <Hand size={10} color={WF_HOT}>now</Hand>
            <div style={{ width: 2, flex: 1, background: WF_LINE_SOFT }} />
          </div>
          <div style={{ flex: 1, padding: '20px 28px', overflow: 'auto' }}>
            <Hand size={22} style={{ display: 'block', marginBottom: 16 }}>
              Downstream — Tuesday, May 12
            </Hand>
            {[
              ['THE LAMP INDEX', 'On the bell-keepers of Hollowmere', '18 min ago', 'A long one. Folk-horror set in a town that worships silence.', true],
              ['SALTVANE', 'Tide notes, third', '2 hours ago', 'Brackish at the second sluice. A heron that wasn\'t there yesterday.', false],
              ['SIX DOORS', 'Why I keep two notebooks', 'yesterday', 'One for what happens, one for what I wish would.', false],
              ['THE LAMP INDEX', 'A short note on lamps', '3 days ago', 'A correction. Also, an apology.', false],
            ].map(([w, t, time, lead, hot], i) => (
              <div key={i} style={{
                marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${WF_LINE_SOFT}`,
              }}>
                <Row gap={8} style={{ marginBottom: 4 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                                   color: hot ? WF_HOT : '#888578', letterSpacing: 0.7 }}>{w}</div>
                  <div style={{ fontSize: 10, color: '#9a9789', fontFamily: 'IBM Plex Mono, monospace' }}>· {time}</div>
                </Row>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 17, marginBottom: 4 }}>{t}</div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 13, color: '#56544d', fontStyle: 'italic', lineHeight: 1.5 }}>{lead}</div>
              </div>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={20} left={-160} arrow="right" width={150}>
        Same stream metaphor, but here you scroll <i>others'</i> rivers.
      </Annot>
    </div>
  );
}

function D_Discover() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Discover · rivers">
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row>
            <Hand size={22}>Rivers worth following</Hand>
            <div style={{ flex: 1 }} />
            <Hand size={11} color="#888578">sort by: cadence ▾</Hand>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['◐ The Lamp Index', '1.2k followers', 'weekly', 'Folk-horror dispatches from a coastal town.', [3, 5, 2, 6, 4, 2, 5]],
              ['Λ Saltvane', '430 followers', 'daily', 'Field notes from a marsh. Mostly birds.', [1, 1, 1, 1, 1, 1, 1]],
              ['✦ Six Doors', '2.4k followers', 'sporadic', 'Six writers, one shared river.', [0, 5, 0, 0, 7, 0, 2]],
              ['◇ Cinder & Marrow', '88 followers', 'whenever', 'A bone-archivist learning to write again.', [2, 0, 1, 0, 3, 0, 0]],
            ].map(([t, m, cadence, b, hist], i) => (
              <Box key={i} pad={14} style={{ background: '#fff' }}>
                <Row>
                  <Hand size={16} style={{ flex: 1 }}>{t}</Hand>
                  <Pill cool>{cadence}</Pill>
                </Row>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{m}</div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 13, color: '#56544d', marginTop: 6 }}>{b}</div>
                {/* tiny cadence histogram */}
                <Row gap={2} style={{ marginTop: 10, alignItems: 'flex-end' }}>
                  {hist.map((h, j) => (
                    <div key={j} style={{
                      width: 12, height: Math.max(2, h * 4),
                      background: h > 0 ? WF_INK : WF_LINE_SOFT, borderRadius: 1,
                    }} />
                  ))}
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#9a9789', marginLeft: 6 }}>last 7d</div>
                </Row>
                <Row gap={6} style={{ marginTop: 10 }}>
                  <Pill hot>follow river</Pill>
                  <Pill>preview</Pill>
                </Row>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={30} right={-160} arrow="left" width={150}>
        Cadence chart helps you avoid following a river that\'ll never water you.
      </Annot>
    </div>
  );
}

Object.assign(window, { D_Writing, D_Notes, D_Feed, D_Discover });
