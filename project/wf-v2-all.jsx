// v2 — "Worlds as Rooms" deepened: templates, mode toggle, co-writing.
// Self-contained (inlines wireframe primitives so this is the only babel src).

// ─── primitives ────────────────────────────────────────────────────────
const WF_INK = '#3a3a37', WF_LINE = '#c8c5bd', WF_LINE_SOFT = '#d9d6cd';
const WF_PAPER = '#fbfaf6', WF_FILL = '#ece9e0', WF_HOT = '#d76a3a';
const WF_COOL = '#5b7a8a', WF_GREEN = '#6a8a4a';

function Hand({ children, size = 14, color = WF_INK, style = {} }) {
  const r = window.__wfRoughness ?? 0.5;
  const family = r > 0.55 ? 'Kalam, cursive' : 'Caveat, cursive';
  const weight = r > 0.55 ? 400 : 600;
  return <span style={{ fontFamily: family, fontSize: size, fontWeight: weight,
                          color, lineHeight: 1.15, letterSpacing: r > 0.55 ? '0.2px' : 0, ...style }}>{children}</span>;
}

function Lines({ count = 3, gap = 8, last = 0.6, color = WF_LINE }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ height: 6, background: color, borderRadius: 6,
                                width: i === count - 1 ? `${last * 100}%` : '100%' }} />
      ))}
    </div>
  );
}

function Box({ children, dashed = false, fill = 'transparent', pad = 8, style = {}, label, ...rest }) {
  return (
    <div style={{ border: `1px ${dashed ? 'dashed' : 'solid'} ${WF_LINE}`,
                    background: fill, borderRadius: 5, padding: pad, position: 'relative', ...style }} {...rest}>
      {label && <div style={{ position: 'absolute', top: -8, left: 10, background: WF_PAPER, padding: '0 4px' }}>
        <Hand size={11} color="#888578">{label}</Hand>
      </div>}
      {children}
    </div>
  );
}

function Pill({ children, hot = false, cool = false, green = false, filled = false, style = {} }) {
  const color = hot ? WF_HOT : cool ? WF_COOL : green ? WF_GREEN : '#7a786f';
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                         padding: '2px 8px', borderRadius: 999,
                         border: `1px solid ${color}`, color: filled ? '#fff' : color,
                         background: filled ? color : 'transparent',
                         fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 0.4, ...style }}>{children}</div>;
}

function Annot({ children, top, left, right, bottom, arrow = 'down-left', width = 140, color = WF_HOT }) {
  if (!window.__wfAnnotations) return null;
  const r = window.__wfRoughness ?? 0.5;
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
    <div style={{ position: 'absolute', top, left, right, bottom, width, pointerEvents: 'none', zIndex: 5 }}>
      <Hand size={13} color={color} style={{ display: 'block' }}>{children}</Hand>
      <svg width={a.w} height={a.h} style={{ position: 'absolute', left: a.x, top: `calc(100% + ${a.y}px)`, overflow: 'visible' }}>
        <path d={a.d} fill="none" stroke={color} strokeWidth={1.2}
              strokeDasharray={r > 0.5 ? '3 3' : '0'} strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Row({ children, gap = 8, style = {}, align = 'center' }) {
  return <div style={{ display: 'flex', alignItems: align, gap, ...style }}>{children}</div>;
}

function WfWindow({ width = 820, height = 540, title = '', children, statusRight = null }) {
  return (
    <div style={{ width, height, background: WF_PAPER, borderRadius: 10,
                    border: `1px solid ${WF_LINE}`, boxShadow: '0 2px 0 rgba(0,0,0,0.02)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden', color: WF_INK }}>
      <div style={{ height: 26, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '0 10px', borderBottom: `1px solid ${WF_LINE_SOFT}`, background: '#f0eee6' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0,1,2].map((i) => <div key={i} style={{ width: 9, height: 9, borderRadius: 9, background: '#e0ddd2', border: `1px solid ${WF_LINE}` }} />)}
        </div>
        <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: '#888578', marginLeft: 8, flex: 1, lineHeight: 1 }}>{title}</div>
        {statusRight}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</div>
    </div>
  );
}

// ─── shared "Anytype-style" world rail (Discord-server-like) ──────────
function WorldRail({ active = 1 }) {
  const icons = ['◐', 'Λ', '✦', '◇', '+'];
  return (
    <div style={{ width: 50, background: '#efece4', borderRight: `1px solid ${WF_LINE_SOFT}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
      {icons.map((i, idx) => (
        <div key={idx} style={{ width: 32, height: 32,
                                  borderRadius: idx === active ? 8 : 16,
                                  background: idx === active ? '#fff' : WF_FILL,
                                  border: `1px solid ${idx === active ? WF_HOT : WF_LINE}`,
                                  color: idx === active ? WF_HOT : '#888578',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontFamily: 'Newsreader, serif', fontSize: 16 }}>{i}</div>
      ))}
    </div>
  );
}

// ─── secondary menu populated by a template ───────────────────────────
const TEMPLATES = {
  fiction: {
    name: 'Fictional writing',
    sub: 'novel · novella · short story',
    color: WF_HOT,
    items: ['◇ Manuscript', '∴ Characters', '✦ Places', '✷ Lore & rules', '⌖ Inbox (raw)', '⏱ Sessions'],
    sample: 'Mira Voss · the bell-keeper · Hollowmere',
  },
  thesis: {
    name: 'Thesis / research',
    sub: 'long-form academic',
    color: WF_COOL,
    items: ['📄 Manuscript', '⌖ Inbox (raw)', '📚 Sources & quotes', '◯ Arguments', '✎ Outline', '⏱ Sessions'],
    sample: 'Thesis: silence as governance',
  },
  serial: {
    name: 'Substack-style serial',
    sub: 'recurring essays / newsletter',
    color: WF_GREEN,
    items: ['📰 Issues', '⌖ Inbox (raw)', '∴ Recurring people', '🗓 Calendar', '↗ Published', '⏱ Sessions'],
    sample: 'The Lamp Index — folk-horror dispatches',
  },
  journal: {
    name: 'Journal / commonplace',
    sub: 'daily writing, lower stakes',
    color: '#a06a3a',
    items: ['📓 Daily', '⌖ Inbox (raw)', '✦ Recurring themes', '🌱 Seedlings', '⏱ Streak'],
    sample: 'commonplace book · started today',
  },
  blank: {
    name: 'Blank world',
    sub: 'start from nothing',
    color: '#888578',
    items: ['+ add a section'],
    sample: 'untitled',
  },
};

function Sidebar({ tpl = TEMPLATES.fiction, worldName = 'Hollowmere', activeItem = 0, dim = false }) {
  return (
    <div style={{ width: 188, background: '#f6f4ec', borderRight: `1px solid ${WF_LINE_SOFT}`,
                    padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8,
                    opacity: dim ? 0.55 : 1 }}>
      <Hand size={18}>{worldName}</Hand>
      <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: tpl.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {tpl.name.toLowerCase()} · ⇣ local
      </div>
      <div style={{ height: 1, background: WF_LINE_SOFT, margin: '4px 0' }} />
      {tpl.items.map((s, i) => (
        <div key={i} style={{ fontSize: 12, color: i === activeItem ? WF_INK : '#56544d',
                                fontWeight: i === activeItem ? 600 : 400,
                                padding: '2px 4px',
                                background: i === activeItem ? 'rgba(0,0,0,0.04)' : 'transparent',
                                borderRadius: 4 }}>{s}</div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: WF_LINE_SOFT }} />
      <Row gap={4}>
        <Hand size={11} color="#888578">⏱ sprint · 12:04</Hand>
        <div style={{ flex: 1 }} />
        <Hand size={11} color={WF_GREEN}>🔥 4d streak</Hand>
      </Row>
    </div>
  );
}

// ─── mode toggle (big right-hand stage for choosing Write / Dump / Split)
function ModeToggle({ value, onChange }) {
  const modes = [
    { id: 'write', label: 'WRITE', glyph: '✎', sub: 'focused prose' },
    { id: 'split', label: 'SPLIT', glyph: '◧', sub: 'both at once' },
    { id: 'dump',  label: 'DUMP',  glyph: '⌖', sub: 'brain canvas' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, background: '#f0eee6',
                    padding: 4, borderRadius: 8, border: `1px solid ${WF_LINE_SOFT}` }}>
      {modes.map((m) => {
        const active = m.id === value;
        return (
          <div key={m.id} onClick={() => onChange && onChange(m.id)}
            style={{ padding: '4px 12px', borderRadius: 6,
                       background: active ? '#fff' : 'transparent',
                       border: `1px solid ${active ? WF_HOT : 'transparent'}`,
                       color: active ? WF_HOT : '#888578',
                       cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: 14 }}>{m.glyph}</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, letterSpacing: 0.6, fontWeight: 600 }}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── writing surface ──────────────────────────────────────────────────
function WriteSurface({ compact = false, presence = null }) {
  return (
    <div style={{ flex: 1, padding: compact ? '24px 28px' : '36px 56px',
                    display: 'flex', flexDirection: 'column', gap: 12, background: WF_PAPER,
                    position: 'relative', minWidth: 0 }}>
      <div style={{ fontFamily: 'Newsreader, serif', fontSize: compact ? 20 : 24, fontWeight: 500 }}>
        The bell-keeper's last morning
      </div>
      <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9a9789' }}>
        Draft · 1,204 words · saved locally 12s ago
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <Lines count={3} />
        <Lines count={4} last={0.4} />
        <Lines count={2} last={0.7} />
        {!compact && <Lines count={3} last={0.5} />}
      </div>
      {/* presence cursor */}
      {presence && (
        <div style={{ position: 'absolute', top: 130, left: compact ? 200 : 280 }}>
          <div style={{ width: 2, height: 18, background: presence.color }} />
          <div style={{ position: 'absolute', top: 18, left: 0, padding: '2px 6px',
                          background: presence.color, color: '#fff', fontSize: 10,
                          fontFamily: 'IBM Plex Mono, monospace', borderRadius: 3, whiteSpace: 'nowrap' }}>
            {presence.name}
          </div>
        </div>
      )}
      {/* summon-on-demand bar */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                      background: '#fff', border: `1px solid ${WF_LINE}`, borderRadius: 999,
                      padding: '4px 12px', display: 'flex', gap: 10 }}>
        {['+ note', '+ char', '⌥ link', '↗ publish'].map((s, i) =>
          <Hand key={i} size={11} color="#56544d">{s}</Hand>)}
      </div>
    </div>
  );
}

// ─── brain-dump canvas (sticky thoughts, free arrangement) ────────────
function DumpCanvas({ compact = false, presence = null }) {
  const nodes = [
    { l: 24,  t: 20,  w: 130, h: 64, c: '#fffdf3', kind: 'note', label: 'bell rings on the wrong morning' },
    { l: 168, t: 36,  w: 110, h: 60, c: '#fff', kind: 'char', label: '∴ Mira Voss' },
    { l: 24,  t: 100, w: 120, h: 64, c: '#fffdf3', kind: 'note', label: 'priest\'s coat smells of pepper' },
    { l: 160, t: 110, w: 130, h: 62, c: '#fff', kind: 'place', label: '✦ The Tollhouse' },
    { l: 305, t: 60,  w: 90,  h: 58, c: '#fffdf3', kind: 'note', label: '"she was already late"' },
    { l: 24,  t: 178, w: 160, h: 56, c: '#fff', kind: 'lore', label: '✷ The Long Quiet' },
    { l: 198, t: 188, w: 130, h: 48, c: '#fffdf3', kind: 'note', label: 'why is salt holy?' },
  ];
  const kColor = { note: WF_HOT, char: '#5b6f55', place: '#7b6a4a', lore: '#7a4f6e' };
  return (
    <div style={{ flex: 1, position: 'relative', minWidth: 0,
                    background: `${WF_PAPER} radial-gradient(#e8e4d8 1px, transparent 1px) 0 0 / 18px 18px` }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ position: 'absolute', left: n.l, top: n.t, width: n.w, height: n.h,
                                background: n.c, border: `1px solid ${WF_LINE}`, borderRadius: 6,
                                padding: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                          color: kColor[n.kind], letterSpacing: 0.5, textTransform: 'uppercase' }}>{n.kind}</div>
          <Hand size={12}>{n.label}</Hand>
        </div>
      ))}
      {/* mini toolbar */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10,
                      display: 'flex', gap: 8, alignItems: 'center' }}>
        <Box pad="4px 10px" style={{ background: '#fff' }}>
          <Hand size={11} color="#56544d">+ thought</Hand>
        </Box>
        <Box pad="4px 10px" style={{ background: '#fff' }}>
          <Hand size={11} color="#56544d">+ person</Hand>
        </Box>
        <Box pad="4px 10px" style={{ background: '#fff' }}>
          <Hand size={11} color="#56544d">+ place</Hand>
        </Box>
        <div style={{ flex: 1 }} />
        <Hand size={10} color="#888578">drag · pinch to zoom</Hand>
      </div>
      {presence && (
        <div style={{ position: 'absolute', top: 60, left: compact ? 200 : 220, pointerEvents: 'none' }}>
          <svg width={16} height={20}><path d="M 0 0 L 16 8 L 7 9 L 5 18 Z" fill={presence.color} /></svg>
          <div style={{ marginTop: -2, padding: '2px 6px', background: presence.color, color: '#fff',
                          fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', borderRadius: 3,
                          display: 'inline-block', whiteSpace: 'nowrap' }}>{presence.name}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  WF_INK, WF_LINE, WF_LINE_SOFT, WF_PAPER, WF_FILL, WF_HOT, WF_COOL, WF_GREEN,
  Hand, Lines, Box, Pill, Annot, Row, WfWindow, WorldRail, Sidebar,
  ModeToggle, WriteSurface, DumpCanvas, TEMPLATES,
});

// ═══════ SCREENS ═══════════════════════════════════════════════════════

// 1. New world · template picker
function S_Templates() {
  const cards = [
    ['fiction', '◇', 'Manuscript · Characters · Places · Lore'],
    ['thesis', '📄', 'Manuscript · Sources · Arguments · Outline'],
    ['serial', '📰', 'Issues · Calendar · Recurring people'],
    ['journal', '📓', 'Daily · Themes · Seedlings · Streak'],
    ['blank', '○', 'one empty room. add what you need.'],
  ];
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="new world">
        <div style={{ flex: 1, padding: '34px 48px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <Hand size={26}>What kind of world?</Hand>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 13, color: '#56544d', marginTop: 4 }}>
              Pick a template — it just prepopulates the sidebar. You can change everything later.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 4 }}>
            {cards.slice(0, 3).map(([key, glyph, items]) => {
              const t = TEMPLATES[key];
              const active = key === 'fiction';
              return (
                <Box key={key} pad={14} style={{ background: '#fff',
                                                    borderColor: active ? WF_HOT : WF_LINE,
                                                    boxShadow: active ? '0 2px 10px rgba(0,0,0,0.05)' : 'none' }}>
                  <Row>
                    <div style={{ width: 40, height: 40, borderRadius: 8,
                                    background: WF_FILL, color: t.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'Newsreader, serif', fontSize: 22 }}>{glyph}</div>
                    <div style={{ marginLeft: 10 }}>
                      <Hand size={16}>{t.name}</Hand>
                      <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>{t.sub}</div>
                    </div>
                  </Row>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#56544d',
                                  fontFamily: 'Newsreader, serif', fontStyle: 'italic', lineHeight: 1.4 }}>
                    sidebar: {items}
                  </div>
                  {active && (
                    <div style={{ marginTop: 10, padding: 8, background: '#fffdf3',
                                    border: `1px dashed ${WF_LINE}`, borderRadius: 4 }}>
                      <Hand size={11} color={t.color}>✓ selected — name it →</Hand>
                    </div>
                  )}
                </Box>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {cards.slice(3).map(([key, glyph, items]) => {
              const t = TEMPLATES[key];
              return (
                <Box key={key} pad={14} style={{ background: '#fff' }}>
                  <Row>
                    <div style={{ width: 40, height: 40, borderRadius: 8,
                                    background: WF_FILL, color: t.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'Newsreader, serif', fontSize: 22 }}>{glyph}</div>
                    <div style={{ marginLeft: 10 }}>
                      <Hand size={16}>{t.name}</Hand>
                      <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>{t.sub}</div>
                    </div>
                  </Row>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#56544d',
                                  fontFamily: 'Newsreader, serif', fontStyle: 'italic', lineHeight: 1.4 }}>
                    sidebar: {items}
                  </div>
                </Box>
              );
            })}
            <Box pad={14} dashed style={{ background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand size={14} color="#888578">+ save your own as a template</Hand>
            </Box>
          </div>
          <Row style={{ marginTop: 4 }}>
            <Box pad="6px 12px" style={{ background: '#fff' }}>
              <Hand size={12}>name: Hollowmere</Hand>
            </Box>
            <span style={{ width: 8 }} />
            <Pill cool>⇣ local only</Pill>
            <span style={{ width: 6 }} />
            <Pill>○ private, can invite</Pill>
            <div style={{ flex: 1 }} />
            <Pill hot filled>enter world →</Pill>
          </Row>
        </div>
      </WfWindow>
      <Annot top={20} left={-170} arrow="right" width={160}>
        Template = sidebar preset. Nothing locked — rename, add, delete later.
      </Annot>
      <Annot top={420} right={-170} arrow="left" width={160} color={WF_COOL}>
        Local/cloud toggle is set per-world, right at creation.
      </Annot>
    </div>
  );
}

// 2. Inside a room — WRITE mode (default)
function S_RoomWrite() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Hollowmere · bell-keeper draft"
        statusRight={<Row gap={8} style={{ marginRight: 8 }}>
          <ModeToggle value="write" />
          <Hand size={11} color="#888578">⇣ local</Hand>
        </Row>}>
        <WorldRail active={1} />
        <Sidebar tpl={TEMPLATES.fiction} worldName="Hollowmere" activeItem={0} />
        <WriteSurface />
      </WfWindow>
      <Annot top={-32} right={60} arrow="down-right" width={200}>
        Mode toggle lives in the title bar — always one click between Write / Dump / Split.
      </Annot>
      <Annot top={70} left={-170} arrow="right" width={160} color={WF_COOL}>
        Sidebar came from the "Fictional writing" template.
      </Annot>
    </div>
  );
}

// 3. DUMP mode
function S_RoomDump() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Hollowmere · brain dump"
        statusRight={<Row gap={8} style={{ marginRight: 8 }}>
          <ModeToggle value="dump" />
          <Hand size={11} color="#888578">⇣ local</Hand>
        </Row>}>
        <WorldRail active={1} />
        <Sidebar tpl={TEMPLATES.fiction} worldName="Hollowmere" activeItem={4} />
        <DumpCanvas />
      </WfWindow>
      <Annot top={30} right={-170} arrow="left" width={160}>
        Same room, different mode. Nothing here is "filed" yet — that's the point.
      </Annot>
      <Annot top={380} left={-170} arrow="right" width={160} color={WF_COOL}>
        ADHD-friendly: dump first, classify later (or never).
      </Annot>
    </div>
  );
}

// 4. SPLIT mode
function S_RoomSplit() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Hollowmere · split"
        statusRight={<Row gap={8} style={{ marginRight: 8 }}>
          <ModeToggle value="split" />
          <Hand size={11} color="#888578">⇣ local</Hand>
        </Row>}>
        <WorldRail active={1} />
        <Sidebar tpl={TEMPLATES.fiction} worldName="Hollowmere" activeItem={0} />
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <WriteSurface compact />
          <div style={{ width: 4, background: '#efece4', cursor: 'col-resize',
                          borderLeft: `1px dashed ${WF_LINE}`, borderRight: `1px dashed ${WF_LINE}` }} />
          <DumpCanvas compact />
        </div>
      </WfWindow>
      <Annot top={40} left={-170} arrow="right" width={160}>
        Split: write on the left, drop scraps into the dump on the right.
      </Annot>
      <Annot top={250} right={-170} arrow="left" width={160} color={WF_COOL}>
        Drag a sticky from the dump → onto the page = it becomes a link.
      </Annot>
      <Annot bottom={20} left={320} arrow="up-left" width={160}>
        Divider draggable — slide it to 0% or 100% to collapse a side.
      </Annot>
    </div>
  );
}

// 5. Co-writing — split mode with another writer present
function S_CoWriting() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Six Doors · shared room · 2 writing"
        statusRight={<Row gap={8} style={{ marginRight: 8 }}>
          <ModeToggle value="split" />
          {/* presence avatars */}
          <Row gap={-4}>
            <Avatar color={WF_HOT} initial="Y" />
            <Avatar color="#4a78b8" initial="R" offset />
            <Avatar color="#6a8a4a" initial="K" offset />
          </Row>
          <Hand size={11} color={WF_GREEN}>⇡ synced</Hand>
        </Row>}>
        <WorldRail active={2} />
        <div style={{ width: 188, background: '#f6f4ec', borderRight: `1px solid ${WF_LINE_SOFT}`,
                        padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Hand size={18}>Six Doors</Hand>
          <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: WF_GREEN, letterSpacing: 0.6 }}>
            SHARED · 3 writers
          </div>
          <Row gap={4} style={{ marginTop: 2 }}>
            <Avatar color={WF_HOT} initial="Y" tiny />
            <Avatar color="#4a78b8" initial="R" tiny />
            <Avatar color="#6a8a4a" initial="K" tiny />
            <Hand size={10} color="#888578" style={{ marginLeft: 4 }}>you, Rae, Kit</Hand>
          </Row>
          <div style={{ height: 1, background: WF_LINE_SOFT, margin: '6px 0' }} />
          {['◇ Manuscript (you)', '◇ Manuscript (Rae) ●', '∴ Characters (shared)', '✦ Places', '✷ Lore', '💬 Chat (3)'].map((s, i) => (
            <div key={i} style={{ fontSize: 12, padding: '2px 4px',
                                    color: i === 0 ? WF_INK : '#56544d',
                                    fontWeight: i === 0 ? 600 : 400,
                                    background: i === 0 ? 'rgba(0,0,0,0.04)' : 'transparent',
                                    borderRadius: 4 }}>{s}</div>
          ))}
          <div style={{ flex: 1 }} />
          <Hand size={10} color="#888578">Kit is editing Lore →</Hand>
        </div>
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <WriteSurface compact />
          <div style={{ width: 4, background: '#efece4', cursor: 'col-resize',
                          borderLeft: `1px dashed ${WF_LINE}`, borderRight: `1px dashed ${WF_LINE}` }} />
          <DumpCanvas compact presence={{ color: '#4a78b8', name: 'Rae' }} />
        </div>
      </WfWindow>
      <Annot top={-32} right={140} arrow="down-right" width={180}>
        Live presence: avatars in the title, cursors in the canvas, ● next to who's editing what.
      </Annot>
      <Annot top={250} left={-170} arrow="right" width={160} color={WF_COOL}>
        Shared rooms behave like Discord servers — you can have private rooms <i>and</i> shared ones, all at once.
      </Annot>
      <Annot bottom={20} right={-170} arrow="left" width={150}>
        Inline chat lives as one of the sidebar items, never floating.
      </Annot>
    </div>
  );
}

function Avatar({ color, initial, offset = false, tiny = false }) {
  const s = tiny ? 16 : 22;
  return (
    <div style={{ width: s, height: s, borderRadius: s, background: color,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: tiny ? 9 : 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    border: '2px solid #f0eee6', marginLeft: offset ? -8 : 0 }}>{initial}</div>
  );
}

// 6. Feed — light, like B's audience
function S_Feed() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Feed · worlds you follow">
        <WorldRail active={-1} />
        <div style={{ width: 188, background: '#f6f4ec', padding: 14,
                        borderRight: `1px solid ${WF_LINE_SOFT}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Hand size={16}>Following</Hand>
          {['◐ The Lamp Index', 'Λ Saltvane', '✦ Six Doors', '◇ Cinder & Marrow'].map((s, i) => (
            <Row key={i} gap={6}>
              <div style={{ width: 6, height: 6, borderRadius: 6, background: i < 2 ? WF_HOT : WF_LINE }} />
              <div style={{ fontSize: 12 }}>{s}</div>
            </Row>
          ))}
          <div style={{ height: 1, background: WF_LINE_SOFT, margin: '6px 0' }} />
          <Hand size={12} color="#888578">discover →</Hand>
        </div>
        <div style={{ flex: 1, padding: '20px 28px', overflow: 'auto' }}>
          <Row style={{ marginBottom: 14 }}>
            <Hand size={22}>Today</Hand>
            <div style={{ flex: 1 }} />
            <Pill>latest</Pill><span style={{ width: 6 }} /><Pill cool>unread (4)</Pill>
          </Row>
          {[
            ['THE LAMP INDEX', 'On the bell-keepers of Hollowmere', '18 min ago',
             'A long one. Folk-horror set in a town that worships silence.', true],
            ['SALTVANE', 'Tide notes, third', '2 hours ago',
             'Brackish at the second sluice. A heron that wasn\'t there yesterday.', false],
            ['SIX DOORS', 'Why I keep two notebooks', 'yesterday',
             'One for what happens, one for what I wish would.', false],
          ].map(([w, t, time, lead, hot], i) => (
            <div key={i} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${WF_LINE_SOFT}` }}>
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
      </WfWindow>
    </div>
  );
}

// 7. Discover — using the B.4 "two highlight cards + browse-by-shape grid" pattern
function S_Discover() {
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title="Discover · worlds & writers">
        <WorldRail active={-1} />
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row>
            <Hand size={22}>Find a world to live in</Hand>
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
                <Pill cool>follow person</Pill><Pill>peek worlds</Pill>
              </Row>
            </Box>
            <Box pad={14} style={{ flex: 1, background: '#fff' }}>
              <Hand size={11} color="#888578">a world to enter</Hand>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, marginTop: 4 }}>Six Doors</div>
              <div style={{ fontSize: 12, color: '#56544d', fontFamily: 'Newsreader, serif', marginTop: 4, lineHeight: 1.4 }}>
                A shared world tended by six writers. Co-writing room open to applicants.
              </div>
              <Row gap={6} style={{ marginTop: 10 }}>
                <Pill cool>follow world</Pill><Pill green>apply to co-write</Pill>
              </Row>
            </Box>
          </div>
          <Hand size={14}>Browse by shape</Hand>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['serial fiction', 187], ['daily field notes', 92],
              ['long essays', 144], ['open / shared worlds', 38],
              ['poetry', 67], ['visual journals', 51],
              ['letters', 24], ['theses in progress', 19],
            ].map(([s, n], i) => (
              <Box key={i} pad={10}>
                <Hand size={13}>{s}</Hand>
                <div style={{ fontSize: 10, color: '#888578', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>{n} worlds</div>
              </Box>
            ))}
          </div>
        </div>
      </WfWindow>
      <Annot top={150} right={-170} arrow="left" width={160} color={WF_GREEN}>
        "Apply to co-write" — the new social affordance, when a world allows it.
      </Annot>
    </div>
  );
}

// ─── brief ────────────────────────────────────────────────────────────
function Brief() {
  return (
    <div style={{ padding: 28, fontFamily: 'Newsreader, serif', color: '#2a2a28',
                    lineHeight: 1.55, fontSize: 14, width: '100%', height: '100%',
                    overflow: 'auto', background: WF_PAPER }}>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: 32, marginBottom: 6 }}>
        v2 — Rooms, with templates, modes & co-writing
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#888578',
                      letterSpacing: 0.6, marginBottom: 16 }}>
        BASED ON A · WORLDS AS ROOMS
      </div>
      <p style={{ margin: '0 0 12px' }}>
        Three additions to the original Rooms direction:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 14 }}>
        {[
          ['1 · Templates', 'When you create a world you pick a template (fiction, thesis, serial, journal, blank). The template prepopulates the sidebar — drafts, characters, sources, etc. Nothing is locked; rename or delete anything.'],
          ['2 · Two modes per room', 'A room has a Write surface and a Brain Dump canvas. A title-bar toggle flips between Write · Split · Dump. Split shows both side-by-side with a draggable divider.'],
          ['3 · Co-writing', 'Any world can be marked Shared — turns it into a Discord-server-style room with multiple writers, presence cursors, per-section editing markers, and inline chat as one sidebar item.'],
        ].map(([t, d], i) => (
          <div key={i} style={{ padding: 10, background: '#fffdf3', border: `1px dashed ${WF_LINE}`, borderRadius: 6 }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18 }}>{t}</div>
            <div style={{ fontSize: 12, color: '#56544d', marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#56544d' }}>
        Discover screen reuses the B.4 pattern (two highlight cards + browse-by-shape grid),
        because you asked. Feed and other screens carry the same world-rail / sidebar bones.
      </p>
      <div style={{ marginTop: 12, fontSize: 11, color: '#888578', fontFamily: 'IBM Plex Mono, monospace' }}>
        next: open questions — see Tweaks to switch templates or modes inline.
      </div>
    </div>
  );
}

// ─── app ──────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "annotations": true,
  "roughness": 0.5,
  "template_preview": "fiction",
  "paper": "light"
}/*EDITMODE-END*/;

function CenterFrame({ children }) {
  return <div style={{ width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center' }}>{children}</div>;
}

function S_TemplatePreview({ template }) {
  const tpl = TEMPLATES[template] || TEMPLATES.fiction;
  return (
    <div style={{ position: 'relative' }}>
      <WfWindow width={820} height={540} title={`${tpl.sample} · just-created`}
        statusRight={<Row gap={8} style={{ marginRight: 8 }}>
          <ModeToggle value="write" />
          <Hand size={11} color="#888578">⇣ local</Hand>
        </Row>}>
        <WorldRail active={0} />
        <Sidebar tpl={tpl} worldName={tpl.sample.split(' · ')[0]} activeItem={0} />
        <div style={{ flex: 1, padding: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Hand size={28}>A blank page in {tpl.sample.split(' · ')[0]}</Hand>
          <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: '#9a9789' }}>
            new · 0 words · template: {tpl.name.toLowerCase()}
          </div>
          <div style={{ height: 6 }} />
          <Lines count={1} last={0.8} color={WF_LINE_SOFT} />
          <Hand size={13} color="#888578" style={{ marginTop: 12 }}>
            ↳ swap the template in Tweaks → watch the sidebar repopulate.
          </Hand>
        </div>
      </WfWindow>
      <Annot top={20} left={-170} arrow="right" width={160} color={tpl.color}>
        Template is just a starting kit. {tpl.items.length} sidebar entries, all renamable.
      </Annot>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  window.__wfAnnotations = t.annotations;
  window.__wfRoughness = t.roughness;
  React.useEffect(() => {
    document.body.style.background = t.paper === 'dark' ? '#2a2825' : '#f4f3ef';
  }, [t.paper]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="intro" title="Writing app · v2"
                    subtitle="Worlds as Rooms, deepened: templates, mode toggle, co-writing.">
          <DCArtboard id="brief" label="brief" width={680} height={500}><Brief /></DCArtboard>
        </DCSection>

        <DCSection id="create" title="1 · Creating a world"
                    subtitle="Templates prepopulate the sidebar. Swap the template in Tweaks to see the sidebar change.">
          <DCArtboard id="templates" label="1.1 · Template picker" width={880} height={600}><CenterFrame><S_Templates /></CenterFrame></DCArtboard>
          <DCArtboard id="preview" label="1.2 · Just-created world" width={880} height={600}><CenterFrame><S_TemplatePreview template={t.template_preview} /></CenterFrame></DCArtboard>
        </DCSection>

        <DCSection id="room" title="2 · Inside a room — two modes"
                    subtitle="Write mode, Brain-Dump mode, or split. Title-bar toggle flips between them.">
          <DCArtboard id="write" label="2.1 · Write" width={880} height={600}><CenterFrame><S_RoomWrite /></CenterFrame></DCArtboard>
          <DCArtboard id="dump"  label="2.2 · Brain dump" width={880} height={600}><CenterFrame><S_RoomDump /></CenterFrame></DCArtboard>
          <DCArtboard id="split" label="2.3 · Split" width={880} height={600}><CenterFrame><S_RoomSplit /></CenterFrame></DCArtboard>
        </DCSection>

        <DCSection id="co" title="3 · Co-writing"
                    subtitle="Mark a world Shared. Presence, per-section editing, inline chat.">
          <DCArtboard id="cowrite" label="3.1 · Shared room (split, 2 writing)" width={880} height={600}><CenterFrame><S_CoWriting /></CenterFrame></DCArtboard>
        </DCSection>

        <DCSection id="social" title="4 · Social — feed & discover"
                    subtitle="Discover reuses the B.4 pattern (highlight cards + browse by shape).">
          <DCArtboard id="feed" label="4.1 · Feed" width={880} height={600}><CenterFrame><S_Feed /></CenterFrame></DCArtboard>
          <DCArtboard id="disc" label="4.2 · Discover (B.4 layout)" width={880} height={600}><CenterFrame><S_Discover /></CenterFrame></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="View" />
        <TweakToggle label="Annotations" value={t.annotations}
                     onChange={(v) => setTweak('annotations', v)} />
        <TweakSlider label="Sketch roughness" value={t.roughness} min={0} max={1} step={0.05}
                     onChange={(v) => setTweak('roughness', v)} />
        <TweakSection label="Try a template" />
        <TweakSelect label="Sidebar preset"
                     value={t.template_preview}
                     options={[
                       { value: 'fiction', label: 'Fictional writing' },
                       { value: 'thesis',  label: 'Thesis / research' },
                       { value: 'serial',  label: 'Substack-style serial' },
                       { value: 'journal', label: 'Journal / commonplace' },
                       { value: 'blank',   label: 'Blank world' },
                     ]}
                     onChange={(v) => setTweak('template_preview', v)} />
        <TweakSection label="Paper" />
        <TweakRadio label="Tone" value={t.paper}
                    options={['light', 'dark']}
                    onChange={(v) => setTweak('paper', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
