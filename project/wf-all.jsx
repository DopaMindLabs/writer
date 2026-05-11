// ───────── wf-base.jsx ─────────
// Shared wireframe primitives. Light grey boxes + handwritten annotations.
// Roughness 0..1 controls handwriting weight and stroke dashiness.
// Annotations on/off controlled by window.__wfAnnotations (read at render).

const WF_INK = '#3a3a37';
const WF_LINE = '#c8c5bd';
const WF_LINE_SOFT = '#d9d6cd';
const WF_PAPER = '#fbfaf6';
const WF_FILL = '#ece9e0';
const WF_HOT = '#d76a3a';      // sparing accent
const WF_COOL = '#5b7a8a';     // sparing accent

// ── WfWindow: a generic desktop window frame, lighter than macos chrome ──
function WfWindow({ width = 760, height = 500, title = '', children, statusRight = null }) {
  return (
    <div style={{
      width, height, background: WF_PAPER, borderRadius: 10,
      border: `1px solid ${WF_LINE}`, boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'Inter, system-ui, sans-serif', color: WF_INK,
    }}>
      <div style={{
        height: 26, display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px', borderBottom: `1px solid ${WF_LINE_SOFT}`,
        background: '#f0eee6',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#e0ddd2', '#e0ddd2', '#e0ddd2'].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 9, background: c, border: `1px solid ${WF_LINE}` }} />
          ))}
        </div>
        <div style={{
          fontFamily: 'Caveat, cursive', fontSize: 14, color: '#888578',
          marginLeft: 8, flex: 1, lineHeight: 1,
        }}>{title}</div>
        {statusRight}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</div>
    </div>
  );
}

// ── Sketchy text: handwritten labels and notes ────────────────────────
function Hand({ children, size = 14, color = WF_INK, style = {} }) {
  // Roughness lives on a global so we don't have to thread props everywhere.
  const r = (window.__wfRoughness ?? 0.5);
  const family = r > 0.55 ? 'Kalam, cursive' : 'Caveat, cursive';
  const weight = r > 0.55 ? 400 : 600;
  return (
    <span style={{
      fontFamily: family, fontSize: size, fontWeight: weight,
      color, lineHeight: 1.15, letterSpacing: r > 0.55 ? '0.2px' : 0,
      ...style,
    }}>{children}</span>
  );
}

// ── Body text placeholder lines ───────────────────────────────────────
function Lines({ count = 3, width = '100%', gap = 8, last = 0.6, color = WF_LINE }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, width }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          height: 6, background: color, borderRadius: 6,
          width: i === count - 1 ? `${last * 100}%` : '100%',
        }} />
      ))}
    </div>
  );
}

// ── Box: a generic boxed region with optional dashed border + label ──
function Box({ children, dashed = false, fill = 'transparent', pad = 8, style = {}, label, ...rest }) {
  const r = (window.__wfRoughness ?? 0.5);
  return (
    <div style={{
      border: `1px ${dashed ? 'dashed' : 'solid'} ${WF_LINE}`,
      background: fill, borderRadius: r > 0.6 ? 6 : 4, padding: pad,
      position: 'relative', ...style,
    }} {...rest}>
      {label && (
        <div style={{ position: 'absolute', top: -8, left: 10, background: WF_PAPER, padding: '0 4px' }}>
          <Hand size={11} color="#888578">{label}</Hand>
        </div>
      )}
      {children}
    </div>
  );
}

// ── ImgSlot: a striped placeholder for an image ───────────────────────
function ImgSlot({ width = '100%', height = 80, label = 'image', style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 4, border: `1px dashed ${WF_LINE}`,
      background: `repeating-linear-gradient(135deg, #f1eee5 0 6px, #e8e4d8 6px 12px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#9a9789',
      letterSpacing: 0.5, textTransform: 'uppercase', ...style,
    }}>{label}</div>
  );
}

// ── Pill / chip ───────────────────────────────────────────────────────
function Pill({ children, hot = false, cool = false, style = {} }) {
  const color = hot ? WF_HOT : cool ? WF_COOL : '#7a786f';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      border: `1px solid ${color}`, color, fontSize: 10,
      fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.4,
      ...style,
    }}>{children}</div>
  );
}

// ── Annotation: handwritten margin note with arrow, hidden when disabled
function Annot({ children, top, left, right, bottom, arrow = 'down-left', width = 140, color = WF_HOT }) {
  if (!window.__wfAnnotations) return null;
  const r = (window.__wfRoughness ?? 0.5);
  const arrows = {
    'down-left':  { d: 'M 4 0 C 12 18, 28 28, 60 38', x: 0, y: 8, w: 80, h: 50 },
    'down-right': { d: 'M 76 0 C 68 18, 52 28, 20 38', x: -60, y: 8, w: 80, h: 50 },
    'up-left':    { d: 'M 4 50 C 12 32, 28 22, 60 12', x: 0, y: -56, w: 80, h: 50 },
    'up-right':   { d: 'M 76 50 C 68 32, 52 22, 20 12', x: -60, y: -56, w: 80, h: 50 },
    'left':       { d: 'M 70 14 C 50 14, 30 14, 6 14', x: -80, y: -7, w: 80, h: 30 },
    'right':      { d: 'M 4 14 C 24 14, 44 14, 70 14', x: 0, y: -7, w: 80, h: 30 },
  };
  const a = arrows[arrow] || arrows['down-left'];
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom, width,
      pointerEvents: 'none', zIndex: 5,
    }}>
      <Hand size={13} color={color} style={{ display: 'block' }}>{children}</Hand>
      <svg width={a.w} height={a.h} style={{
        position: 'absolute', left: a.x, top: `calc(100% + ${a.y}px)`,
        overflow: 'visible',
      }}>
        <path d={a.d} fill="none" stroke={color}
              strokeWidth={1.2} strokeDasharray={r > 0.5 ? '3 3' : '0'}
              strokeLinecap="round" />
        <path d="M 0 -4 L 6 0 L 0 4 Z" fill={color}
              transform={`translate(${a.d.match(/[0-9.-]+/g).slice(-2).join(',')}) rotate(${arrow.includes('right') ? -10 : arrow.includes('left') ? 190 : 0})`} />
      </svg>
    </div>
  );
}

// ── HBar / row helpers ────────────────────────────────────────────────
function Row({ children, gap = 8, style = {}, align = 'center' }) {
  return <div style={{ display: 'flex', alignItems: align, gap, ...style }}>{children}</div>;
}
function Col({ children, gap = 8, style = {}, align = 'stretch' }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap, ...style }}>{children}</div>;
}

// ── Section header for design canvas: print a small system note above
function SystemNote({ title, body }) {
  return (
    <div style={{
      maxWidth: 520, marginBottom: 12, padding: '8px 12px',
      background: '#fff8ea', border: `1px dashed ${WF_LINE}`, borderRadius: 8,
    }}>
      <Hand size={16} style={{ display: 'block', marginBottom: 2 }}>{title}</Hand>
      <div style={{ fontSize: 12, color: '#56544d', lineHeight: 1.45,
                    fontFamily: 'Newsreader, Georgia, serif' }}>{body}</div>
    </div>
  );
}

Object.assign(window, {
  WF_INK, WF_LINE, WF_LINE_SOFT, WF_PAPER, WF_FILL, WF_HOT, WF_COOL,
  WfWindow, Hand, Lines, Box, ImgSlot, Pill, Annot, Row, Col, SystemNote,
});


// ───────── wf-approach-a.jsx ─────────
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


// ───────── wf-approach-b.jsx ─────────
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


// ───────── wf-approach-c.jsx ─────────
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


// ───────── wf-approach-d.jsx ─────────
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


// ───────── wf-main.jsx ─────────
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


