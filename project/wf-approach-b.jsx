// Approach B — "Stage & Audience" (private studio ↔ public stage, one gesture between)
// Single window, vertical split: left = STAGE (your writing world, dark calm).
// Right = AUDIENCE (the published feed). Center seam is the "publish gesture".

function B_Writing() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · stage">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: WF_PAPER }}>
          {/* mode strip */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${WF_LINE_SOFT}` }}>
            {['STAGE — writing', 'SEAM — publish', 'AUDIENCE — feed'].map((s, i) => (
              <div key={i} style={{
                flex: 1, padding: '8px 14px', textAlign: 'center',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                letterSpacing: 0.6, color: i === 0 ? WF_INK : '#9a9789',
                background: i === 0 ? '#fff' : 'transparent',
                borderRight: i < 2 ? `1px solid ${WF_LINE_SOFT}` : 'none',
                fontWeight: i === 0 ? 600 : 400,
              }}>{s}</div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            {/* writing surface */}
            <div style={{ flex: 1, padding: '40px 60px', background: WF_PAPER,
                            position: 'relative' }}>
              <div style={{ fontFamily: 'Newsreader, Georgia, serif', fontSize: 26, fontWeight: 500, marginBottom: 14 }}>
                Notes on the bell-keeper
              </div>
              <Col gap={10}>
                <Lines count={4} />
                <Lines count={3} last={0.4} />
                <Lines count={2} last={0.7} />
              </Col>
              {/* hush bar */}
              <div style={{ position: 'absolute', bottom: 12, left: 60, right: 60,
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Hand size={11} color="#888578">⏱ 22:14 in this sprint · 612 words</Hand>
                <Hand size={11} color="#888578">⌘K · summon</Hand>
              </div>
            </div>
            {/* right slim audience preview */}
            <div style={{ width: 200, borderLeft: `1px dashed ${WF_LINE}`,
                            background: '#f4f1e8', padding: 14,
                            display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Hand size={13} color="#888578">audience · faded</Hand>
              <Box pad={8}>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>last published</div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 12 }}>"Tide notes, third"</div>
                <Hand size={10} color="#888578" style={{ display: 'block', marginTop: 4 }}>
                  18 readers · 2 replies
                </Hand>
              </Box>
              <Box pad={8} dashed>
                <Hand size={11} color={WF_HOT}>drag draft here to publish →</Hand>
              </Box>
              <div style={{ flex: 1 }} />
              <Hand size={10} color="#888578">audience never enters the stage.</Hand>
            </div>
          </div>
        </div>
      </WfWindow>
      <Annot top={20} left={-170} arrow="right" width={160}>
        Stage / Audience are <i>spatially</i> separate — never the same screen.
      </Annot>
      <Annot top={300} right={-160} arrow="left" width={150} color={WF_COOL}>
        Audience is dim until you cross the seam to publish.
      </Annot>
    </div>
  );
}

function B_Notes() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · stage · backroom">
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: 200, background: '#f6f4ec', padding: 14, borderRight: `1px solid ${WF_LINE_SOFT}` }}>
            <Hand size={16}>Backroom</Hand>
            <div style={{ height: 8 }} />
            {[
              ['◇ Drafts', 4],
              ['∴ People', 12],
              ['✦ Places', 7],
              ['✷ Lore', 31],
              ['⌖ Inbox (raw)', '23!'],
            ].map(([s, n], i) => (
              <Row key={i} style={{ padding: '4px 0' }}>
                <span style={{ fontSize: 12, flex: 1 }}>{s}</span>
                <span style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>{n}</span>
              </Row>
            ))}
          </div>
          <div style={{ flex: 1, padding: 18 }}>
            <Row style={{ marginBottom: 10 }}>
              <Hand size={20}>Quick capture · 23 unsorted</Hand>
              <div style={{ flex: 1 }} />
              <Pill hot>sort now</Pill>
              <span style={{ width: 6 }} />
              <Pill>later</Pill>
            </Row>
            <Hand size={11} color="#888578" style={{ display: 'block', marginBottom: 10 }}>
              dump first · classify never · forgive yourself
            </Hand>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                'bell-keeper rings on the wrong morning',
                'the priest\'s coat smells of pepper',
                'why is salt holy here? need a reason',
                'character: a child who collects silences',
                'opening line — "She was already late."',
                'the calendar has 13 months, one nameless',
              ].map((t, i) => (
                <Box key={i} pad={10} style={{ background: '#fffdf3', borderColor: '#e4dfc4' }}>
                  <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>
                    {['9:02', 'yesterday', 'mon', 'mon', 'sun', 'last week'][i]}
                  </div>
                  <Hand size={14}>{t}</Hand>
                  <Row gap={4} style={{ marginTop: 6 }}>
                    <Pill>→ draft</Pill><Pill>→ lore</Pill><Pill>trash</Pill>
                  </Row>
                </Box>
              ))}
            </div>
          </div>
        </div>
      </WfWindow>
      <Annot top={20} right={-170} arrow="left" width={160} color={WF_HOT}>
        ADHD-friendly: dump → classify is a separate, optional task.
      </Annot>
    </div>
  );
}

function B_Feed() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · audience">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 28px', borderBottom: `1px solid ${WF_LINE_SOFT}`,
                          display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <Hand size={24}>Audience</Hand>
            <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#888578' }}>
              chronological · no algorithm
            </div>
            <div style={{ flex: 1 }} />
            <Pill cool>← back to stage</Pill>
          </div>
          <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            {[
              ['THE LAMP INDEX', 'On the bell-keepers of Hollowmere', 'A long one. Folk-horror set in a town that worships silence. Skip if you\'re tired.', '18m'],
              ['SALTVANE', 'Tide notes, third', 'Brackish water at the second sluice. A heron that wasn\'t there yesterday.', '2h'],
              ['SIX DOORS', 'Why I keep two notebooks', 'One for what happens, one for what I wish would.', 'yest'],
            ].map(([w, t, lead, time], i) => (
              <div key={i} style={{ marginBottom: 22, paddingBottom: 18,
                                       borderBottom: `1px solid ${WF_LINE_SOFT}` }}>
                <Row gap={8} style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10,
                                   letterSpacing: 0.8, color: i === 0 ? WF_HOT : '#888578' }}>{w}</div>
                  <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>· {time}</div>
                </Row>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 20, marginBottom: 6 }}>{t}</div>
                <div style={{ fontFamily: 'Newsreader, serif', fontSize: 13, color: '#56544d',
                                 fontStyle: 'italic', lineHeight: 1.5 }}>{lead}</div>
              </div>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={40} left={-170} arrow="right" width={160}>
        Feed is calm. No likes counter on first view.
      </Annot>
    </div>
  );
}

function B_Discover() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={760} height={500} title="Lotem · audience · discover">
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row>
            <Hand size={22}>Other stages</Hand>
            <div style={{ flex: 1 }} />
            <Box pad="4px 10px" style={{ background: '#fff' }}>
              <Hand size={12} color="#888578">search a writer or world…</Hand>
            </Box>
          </Row>
          <div style={{ display: 'flex', gap: 12 }}>
            <Box pad={14} style={{ flex: 1, background: '#fff' }}>
              <Hand size={11} color="#888578">a writer to know</Hand>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, marginTop: 4 }}>R. Maren</div>
              <div style={{ fontSize: 12, color: '#56544d', fontFamily: 'Newsreader, serif', marginTop: 4, lineHeight: 1.4 }}>
                Three worlds — a folk-horror, a long letter, and a children's bestiary in progress.
              </div>
              <Row gap={6} style={{ marginTop: 10 }}>
                <Pill cool>follow person</Pill><Pill>peek stages</Pill>
              </Row>
            </Box>
            <Box pad={14} style={{ flex: 1, background: '#fff' }}>
              <Hand size={11} color="#888578">a stage to enter</Hand>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, marginTop: 4 }}>Six Doors</div>
              <div style={{ fontSize: 12, color: '#56544d', fontFamily: 'Newsreader, serif', marginTop: 4, lineHeight: 1.4 }}>
                A shared world tended by six writers. Updates when somebody has something true.
              </div>
              <Row gap={6} style={{ marginTop: 10 }}>
                <Pill cool>follow stage</Pill><Pill>open</Pill>
              </Row>
            </Box>
          </div>
          <Hand size={14}>Browse by shape</Hand>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['serial fiction', 'daily field notes', 'long essays', 'open worlds',
              'poetry', 'visual journals', 'letters', 'works-in-progress'].map((s, i) => (
              <Box key={i} pad={10}>
                <Hand size={13}>{s}</Hand>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
                  {(Math.floor(Math.random() * 200) + 40)} stages
                </div>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
    </div>
  );
}

Object.assign(window, { B_Writing, B_Notes, B_Feed, B_Discover });
