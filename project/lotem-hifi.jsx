// Lotem — hi-fi. Warm paper, Newsreader for prose, Inter for UI, oxblood accent.

const C = {
  paper: '#f7f2e5', paper2: '#efe9d8', paper3: '#e6dec7',
  ink: '#1d1b15', ink2: '#43403a', ink3: '#807a6c', ink4: '#b3ad9e',
  rule: '#d6cfba', ruleSoft: '#e4ddc7',
  card: '#fffbf0',
  accent: '#a8412a', accentSoft: '#c66a4f', accentBg: '#f5dcd2',
  moss: '#4d6a3e', mossBg: '#dde7d1',
};

const SERIF = '"Newsreader", "Iowan Old Style", Georgia, serif';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// ─── window frame ─────────────────────────────────────────────────────
function Win({ width = 980, height = 640, title, children, accent = false }) {
  return (
    <div style={{
      width, height, background: C.paper, borderRadius: 14,
      border: `1px solid ${C.rule}`,
      boxShadow: '0 30px 60px -20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.5) inset',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      color: C.ink, fontFamily: SANS,
    }}>
      <div style={{
        height: 40, display: 'flex', alignItems: 'center',
        padding: '0 14px', borderBottom: `1px solid ${C.ruleSoft}`,
        background: C.paper2,
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {[C.accentSoft, '#d4a44a', '#7a9656'].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 11, background: c,
                                    boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.1)' }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: SERIF,
                        fontSize: 13, color: C.ink3, letterSpacing: 0.1 }}>{title}</div>
        <div style={{ width: 50 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</div>
    </div>
  );
}

// ─── world rail ───────────────────────────────────────────────────────
const WORLDS = [
  { id: 'lamp', glyph: '◐', name: 'The Lamp Index', kind: 'private' },
  { id: 'hollow', glyph: 'Λ', name: 'Hollowmere', kind: 'private' },
  { id: 'six', glyph: '✦', name: 'Six Doors', kind: 'shared' },
  { id: 'thesis', glyph: '∎', name: 'Thesis · silence', kind: 'private' },
];

function WorldRail({ active, onPick }) {
  return (
    <div style={{
      width: 62, background: '#312c20',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '14px 0',
      borderRight: `1px solid #221e15`,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 22, color: C.paper, opacity: 0.9, marginBottom: 4,
                       fontStyle: 'italic', fontWeight: 400 }}>L</div>
      <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
      {WORLDS.map((w, i) => {
        const isActive = w.id === active;
        return (
          <div key={w.id} title={w.name}
            style={{ width: 40, height: 40, borderRadius: isActive ? 10 : 20,
                       background: isActive ? C.paper : 'rgba(255,255,255,0.06)',
                       color: isActive ? C.ink : '#d8d2bf',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontFamily: SERIF, fontSize: 18, position: 'relative',
                       boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                       transition: 'all 200ms', cursor: 'default' }}>
            {w.glyph}
            {w.kind === 'shared' && (
              <div style={{ position: 'absolute', bottom: -1, right: -1,
                              width: 10, height: 10, borderRadius: 10,
                              background: C.moss, border: '2px solid #312c20' }} />
            )}
            {isActive && (
              <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                              width: 3, height: 22, borderRadius: 3, background: C.paper }} />
            )}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ width: 36, height: 36, borderRadius: 18,
                      border: `1px dashed rgba(255,255,255,0.18)`,
                      color: 'rgba(255,255,255,0.4)', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
      <div style={{ width: 36, height: 36, borderRadius: 18,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#d8d2bf', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>YK</div>
    </div>
  );
}

// ─── sidebar (template-driven) ────────────────────────────────────────
const TPL = {
  fiction: {
    name: 'Fictional writing',
    sections: [
      { label: 'Manuscript', items: [
          { icon: '◇', name: 'The bell-keeper', meta: '1,204', active: true },
          { icon: '◇', name: 'Chapter 02 — Tollhouse', meta: '618' },
          { icon: '◇', name: 'untitled (Tue)', meta: '94' },
      ]},
      { label: 'World', items: [
          { icon: '∴', name: 'Characters', meta: '12' },
          { icon: '✦', name: 'Places', meta: '7' },
          { icon: '✷', name: 'Lore & rules', meta: '23' },
      ]},
      { label: 'Workshop', items: [
          { icon: '⌖', name: 'Brain dump', meta: '23·' },
          { icon: '⏱', name: 'Sessions', meta: '14d' },
      ]},
    ],
  },
  thesis: {
    name: 'Thesis · research',
    sections: [
      { label: 'Manuscript', items: [
          { icon: '⏍', name: 'Silence as governance', meta: '8,402', active: true },
          { icon: '✎', name: 'Outline', meta: '' },
      ]},
      { label: 'Evidence', items: [
          { icon: '❝', name: 'Quotes & sources', meta: '88' },
          { icon: '◯', name: 'Arguments', meta: '11' },
      ]},
      { label: 'Workshop', items: [
          { icon: '⌖', name: 'Brain dump', meta: '41·' },
          { icon: '⏱', name: 'Sessions', meta: '21d' },
      ]},
    ],
  },
  six: {
    name: 'Shared · Six Doors',
    sections: [
      { label: 'Manuscript', items: [
          { icon: '◇', name: 'My door — fifth', meta: '2,118', active: true },
          { icon: '◇', name: "Rae's door — second", meta: '◌ editing' },
          { icon: '◇', name: 'Kit\'s door — third', meta: '4,002' },
      ]},
      { label: 'Shared world', items: [
          { icon: '∴', name: 'Characters', meta: '24' },
          { icon: '✦', name: 'Places', meta: '11' },
          { icon: '✷', name: 'Common lore', meta: '◌ Kit' },
      ]},
      { label: 'Together', items: [
          { icon: '💬', name: 'Chat', meta: '3' },
          { icon: '⌖', name: 'Brain dump', meta: '88·' },
      ]},
    ],
  },
};

function Sidebar({ worldName, worldKind, template, dim = false, activeOverride }) {
  const tpl = TPL[template] || TPL.fiction;
  return (
    <div style={{
      width: 232, background: C.paper2,
      borderRight: `1px solid ${C.ruleSoft}`,
      display: 'flex', flexDirection: 'column',
      opacity: dim ? 0.5 : 1,
    }}>
      <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${C.ruleSoft}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500, letterSpacing: 0.1 }}>
          {worldName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6,
                          background: worldKind === 'shared' ? C.moss : C.ink3 }} />
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.4 }}>
            {worldKind === 'shared' ? 'SHARED · 3 WRITERS' : 'PRIVATE · LOCAL'}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 8px' }}>
        {tpl.sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ padding: '4px 10px', fontFamily: MONO, fontSize: 9,
                            color: C.ink4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {sec.label}
            </div>
            {sec.items.map((it, j) => {
              const isActive = activeOverride ? activeOverride === `${i}.${j}` : it.active;
              return (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '6px 10px', borderRadius: 7, gap: 8,
                  background: isActive ? C.card : 'transparent',
                  border: `1px solid ${isActive ? C.rule : 'transparent'}`,
                  marginBottom: 1,
                }}>
                  <span style={{ fontFamily: SERIF, fontSize: 13, color: isActive ? C.accent : C.ink3, width: 14 }}>{it.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: isActive ? C.ink : C.ink2,
                                   fontWeight: isActive ? 500 : 400 }}>{it.name}</span>
                  {it.meta && (
                    <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4 }}>{it.meta}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${C.ruleSoft}`, padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 6, background: C.accent }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.4 }}>
          ⏱ 22:14 LEFT
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss, letterSpacing: 0.4 }}>
          🜂 14d
        </span>
      </div>
    </div>
  );
}

// ─── mode toggle ──────────────────────────────────────────────────────
function ModeToggle({ value = 'write', onChange, size = 'md' }) {
  const modes = [
    { id: 'write', label: 'Write',  glyph: '✎' },
    { id: 'split', label: 'Split',  glyph: '◧' },
    { id: 'dump',  label: 'Dump',   glyph: '⌖' },
  ];
  const pad = size === 'sm' ? '4px 10px' : '6px 14px';
  return (
    <div style={{ display: 'inline-flex', background: C.paper3,
                    padding: 3, borderRadius: 10,
                    border: `1px solid ${C.rule}` }}>
      {modes.map((m) => {
        const active = m.id === value;
        return (
          <button key={m.id} onClick={() => onChange && onChange(m.id)}
            style={{ padding: pad, borderRadius: 7, border: 'none',
                       background: active ? C.paper : 'transparent',
                       color: active ? C.ink : C.ink3,
                       fontFamily: SANS, fontSize: 12, fontWeight: 600,
                       letterSpacing: 0.2, cursor: 'pointer',
                       display: 'flex', alignItems: 'center', gap: 6,
                       boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                       transition: 'all 150ms' }}>
            <span style={{ fontFamily: SERIF, fontSize: 13 }}>{m.glyph}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── status bar (right side of titlebar, below title) ────────────────
function StatusBar({ status = 'local', shared = false, sharedAvatars }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 22px', borderBottom: `1px solid ${C.ruleSoft}`,
                    background: C.paper }}>
      {shared ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>{sharedAvatars}</div>
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.moss, letterSpacing: 0.4 }}>
            SYNCED · 2s ago
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: C.ink4 }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 0.4 }}>
            LOCAL · ENCRYPTED
          </span>
          <span style={{ marginLeft: 6, fontFamily: MONO, fontSize: 11, color: C.ink4 }}>
            ↑ enable cloud
          </span>
        </div>
      )}
      <span style={{ flex: 1 }} />
    </div>
  );
}

function Avatar({ initial, color, ring = false, size = 24, offset = false, label }) {
  return (
    <div style={{ position: 'relative', marginLeft: offset ? -8 : 0 }}>
      <div style={{ width: size, height: size, borderRadius: size,
                      background: color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: size * 0.42, fontWeight: 600, fontFamily: SANS,
                      border: `2px solid ${C.paper}` }}>{initial}</div>
      {ring && (
        <div style={{ position: 'absolute', inset: -3, borderRadius: size + 3,
                        border: `2px solid ${color}`, opacity: 0.45 }} />
      )}
    </div>
  );
}

// ═══════ WRITE SURFACE ═══════════════════════════════════════════════
const PROSE = [
  "The bell-keeper rang on the wrong morning.",
  "There were rules about this. Father Ellom kept them in a book the colour of pepper, and the book was supposed to live on the second shelf above the basin where Mira's mother had once kept the salt, and the salt was supposed to live in a jar that nobody touched until the ninth day of the month. None of these things were in their right places anymore.",
  "Mira walked the long way around the square. She did not look at the tower, because the tower had not been wrong in eighty-one years and she did not want to be the one to notice.",
  "The bell rang again. She counted: one, two, three. It should have been seven.",
];

function WriteSurface({ compact = false, presence }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: C.paper,
                    overflow: 'auto', position: 'relative' }}>
      <div style={{ maxWidth: compact ? 460 : 640, margin: '0 auto',
                       padding: compact ? '36px 28px 80px' : '60px 40px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.8 }}>HOLLOWMERE / MANUSCRIPT / CH 1</span>
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: compact ? 30 : 38, fontWeight: 400,
                        lineHeight: 1.1, margin: '0 0 6px', letterSpacing: -0.5 }}>
          The bell-keeper's last morning
        </h1>
        <div style={{ fontFamily: SERIF, fontSize: compact ? 14 : 16, color: C.ink3, fontStyle: 'italic', marginBottom: 30 }}>
          a draft · 1,204 words
        </div>
        {PROSE.map((p, i) => (
          <p key={i} style={{ fontFamily: SERIF, fontSize: compact ? 16 : 18,
                                lineHeight: 1.55, color: C.ink, margin: '0 0 1em',
                                textWrap: 'pretty' }}>{p}</p>
        ))}
        {/* inline link to a character */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '0 4px', borderRadius: 3, background: C.accentBg,
                        fontFamily: SERIF, fontStyle: 'italic', fontSize: compact ? 16 : 18,
                        color: C.accent }}>
          ∴ Father Ellom
        </div>
        {presence && (
          <div style={{ position: 'absolute', top: 200, left: compact ? 200 : 280, pointerEvents: 'none' }}>
            <div style={{ width: 2, height: 22, background: presence.color, borderRadius: 1 }} />
            <div style={{ position: 'absolute', top: 22, left: -2,
                            padding: '3px 7px', background: presence.color, color: '#fff',
                            fontFamily: MONO, fontSize: 10, borderRadius: 3, whiteSpace: 'nowrap',
                            fontWeight: 500 }}>{presence.name}</div>
          </div>
        )}
      </div>
      {/* footer bar */}
      <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0,
                      borderTop: `1px solid ${C.ruleSoft}`, background: 'rgba(247,242,229,0.94)',
                      backdropFilter: 'blur(8px)',
                      padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 0.4 }}>
          1,204 / 1,500 today
        </span>
        <div style={{ width: 80, height: 4, borderRadius: 4, background: C.paper3, overflow: 'hidden' }}>
          <div style={{ width: '80%', height: '100%', background: C.accent, borderRadius: 4 }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 0.4 }}>
          ⏱ 22:14
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.6 }}>
          ⌘K SUMMON
        </span>
        <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none',
                            background: C.accent, color: '#fff', fontFamily: SANS,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            letterSpacing: 0.2 }}>↗ publish</button>
      </div>
    </div>
  );
}

// ═══════ BRAIN DUMP CANVAS ════════════════════════════════════════════
const DUMP_NODES = [
  { l: 28, t: 28, w: 200, h: 86, rot: -1.5, kind: 'note', color: '#fff5cc',
    title: '', body: 'bell rings on the wrong morning — is it her, or is the town slipping?' },
  { l: 252, t: 36, w: 170, h: 76, rot: 1.2, kind: 'char', color: '#ffe3d6',
    title: '∴ Mira Voss', body: '34. bell-keeper since her mother. doesn\'t want this.' },
  { l: 28, t: 134, w: 184, h: 70, rot: -0.4, kind: 'note', color: '#fff5cc',
    title: '', body: 'priest\'s coat smells of pepper. why? keep, even if unused.' },
  { l: 232, t: 138, w: 180, h: 88, rot: 0.6, kind: 'place', color: '#dde7d1',
    title: '✦ The Tollhouse', body: 'crossroads, west. older than the bell. a door that opens both ways.' },
  { l: 440, t: 56, w: 156, h: 64, rot: -2, kind: 'note', color: '#fff5cc',
    title: '', body: '"she was already late" — opener?' },
  { l: 28, t: 226, w: 264, h: 64, rot: 0.8, kind: 'lore', color: '#e9d6e3',
    title: '✷ The Long Quiet', body: 'year 0 of the calendar. nobody remembers it. that\'s the rule.' },
  { l: 432, t: 178, w: 160, h: 80, rot: -1, kind: 'note', color: '#fff5cc',
    title: '', body: 'salt is holy here — but no one knows why anymore. maybe a chapter on this.' },
  { l: 308, t: 244, w: 150, h: 60, rot: 1.4, kind: 'char', color: '#ffe3d6',
    title: '∴ a child', body: 'collects silences. unnamed.' },
];

function DumpCanvas({ compact = false, presence, withSelection = false }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
                    background: `${C.paper}
                      radial-gradient(circle at 1px 1px, ${C.paper3} 1px, transparent 1px)
                      0 0 / 20px 20px` }}>
      {/* connection threads */}
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d="M 140 80 Q 220 50, 320 70" stroke={C.rule} strokeWidth={1} fill="none" strokeDasharray="3 4" />
        <path d="M 320 110 Q 340 170, 322 190" stroke={C.rule} strokeWidth={1} fill="none" strokeDasharray="3 4" />
        <path d="M 130 200 Q 200 230, 280 240" stroke={C.rule} strokeWidth={1} fill="none" strokeDasharray="3 4" />
      </svg>
      {DUMP_NODES.map((n, i) => {
        const kindStyle = {
          note: { fmono: '"note"', kc: C.ink3 },
          char: { fmono: '"character"', kc: C.accent },
          place: { fmono: '"place"', kc: C.moss },
          lore: { fmono: '"lore"', kc: '#7a4f6e' },
        }[n.kind];
        const selected = withSelection && i === 0;
        return (
          <div key={i} style={{
            position: 'absolute', left: n.l, top: n.t, width: n.w, minHeight: n.h,
            transform: `rotate(${n.rot}deg)`,
            background: n.color, borderRadius: 6,
            border: `1px solid ${selected ? C.accent : 'rgba(0,0,0,0.08)'}`,
            boxShadow: selected
              ? `0 0 0 3px ${C.accentBg}, 0 8px 14px -4px rgba(0,0,0,0.15)`
              : '0 2px 4px rgba(0,0,0,0.06), 0 6px 12px -4px rgba(0,0,0,0.08)',
            padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: kindStyle.kc,
                              letterSpacing: 0.8, textTransform: 'uppercase' }}>{n.kind}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 8, color: C.ink4 }}>{['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'now'][i] || ''}</span>
            </div>
            {n.title && (
              <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 500, color: C.ink }}>
                {n.title}
              </div>
            )}
            <div style={{ fontFamily: SERIF, fontSize: 12, color: C.ink2, lineHeight: 1.35, fontStyle: n.kind === 'note' ? 'italic' : 'normal' }}>
              {n.body}
            </div>
          </div>
        );
      })}
      {presence && (
        <div style={{ position: 'absolute', top: 120, left: 380, pointerEvents: 'none' }}>
          <svg width={18} height={22}><path d="M 0 0 L 18 9 L 8 10 L 6 20 Z" fill={presence.color} /></svg>
          <div style={{ marginTop: -1, padding: '3px 7px', background: presence.color, color: '#fff',
                          fontFamily: MONO, fontSize: 10, borderRadius: 3, display: 'inline-block',
                          fontWeight: 500 }}>{presence.name}</div>
        </div>
      )}
      {/* floating action bar */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                      background: C.card, borderRadius: 12,
                      border: `1px solid ${C.rule}`,
                      boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
                      padding: '8px 10px', display: 'flex', gap: 6 }}>
        {[['✎', 'thought'], ['∴', 'person'], ['✦', 'place'], ['✷', 'lore']].map(([g, l], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                   padding: '5px 10px', borderRadius: 7,
                                   background: i === 0 ? C.paper2 : 'transparent',
                                   fontFamily: SANS, fontSize: 11, fontWeight: 500, color: C.ink2 }}>
            <span style={{ fontFamily: SERIF, fontSize: 13, color: C.accent }}>{g}</span>
            +{l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════ SCREEN: TEMPLATE PICKER ═══════════════════════════════════════
function S_Templates() {
  const cards = [
    ['fiction', '◇', 'Fictional writing', 'novel · short story · script',
     'Manuscript, Characters, Places, Lore, Brain dump', true],
    ['thesis', '⏍', 'Thesis / research', 'long-form academic',
     'Manuscript, Sources, Arguments, Outline, Brain dump', false],
    ['serial', '◐', 'Substack-style serial', 'recurring essays · newsletter',
     'Issues, Recurring people, Calendar, Published', false],
    ['journal', '◌', 'Journal / commonplace', 'daily, low-stakes',
     'Daily, Themes, Seedlings, Streak', false],
    ['blank', '○', 'Blank world', 'start from nothing',
     'one empty page · add what you need', false],
  ];
  return (
    <Win width={1040} height={680} title="New world">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                       background: C.paper, padding: '40px 56px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 1, marginBottom: 8 }}>
            01 — A KIND OF ROOM
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 400, margin: 0,
                          lineHeight: 1, letterSpacing: -0.8 }}>
            What kind of world<br/>are you starting?
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 16, color: C.ink2, maxWidth: 540,
                        margin: '14px 0 0', lineHeight: 1.5 }}>
            A template is just a starting shape — the sidebar gets a few rooms
            prepopulated. Rename, add, or delete anything later. Nothing is locked.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {cards.map(([key, g, name, sub, kit, active]) => (
            <div key={key} style={{
              background: C.card, borderRadius: 12,
              border: `1px solid ${active ? C.accent : C.rule}`,
              padding: '18px 18px 16px',
              boxShadow: active ? `0 0 0 3px ${C.accentBg}, 0 6px 14px rgba(0,0,0,0.06)` : 'none',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10,
                                background: active ? C.accentBg : C.paper2,
                                color: active ? C.accent : C.ink2,
                                fontFamily: SERIF, fontSize: 24,
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g}</div>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500 }}>{name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.4, marginTop: 2 }}>
                    {sub}
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 13, color: C.ink2, lineHeight: 1.45 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.ink4, letterSpacing: 0.6, textTransform: 'uppercase' }}>sidebar — </span>
                {kit}
              </div>
              {active && (
                <div style={{ position: 'absolute', top: 14, right: 14,
                                width: 22, height: 22, borderRadius: 22, background: C.accent,
                                color: '#fff', fontSize: 13, display: 'flex',
                                alignItems: 'center', justifyContent: 'center' }}>✓</div>
              )}
            </div>
          ))}
          <div style={{ background: 'transparent', borderRadius: 12,
                          border: `1px dashed ${C.rule}`, padding: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: SERIF, fontSize: 14, color: C.ink3, fontStyle: 'italic' }}>
            save your own as a template
          </div>
        </div>
        <div style={{ marginTop: 28, padding: '14px 18px',
                        background: C.paper2, borderRadius: 12,
                        border: `1px solid ${C.ruleSoft}`,
                        display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.8 }}>02 —</span>
          <span style={{ fontFamily: SERIF, fontSize: 16, color: C.ink2 }}>name it</span>
          <input defaultValue="Hollowmere" style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: C.ink,
            borderBottom: `1px solid ${C.rule}`, padding: '2px 6px', minWidth: 200,
          }} />
          <span style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontSize: 12, color: C.ink2 }}>
            <span style={{ width: 28, height: 16, borderRadius: 16, background: C.ink2,
                            position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', top: 2, left: 14, width: 12, height: 12,
                              borderRadius: 12, background: C.paper }} />
            </span>
            cloud sync — <span style={{ color: C.ink3 }}>off, this stays local</span>
          </label>
          <button style={{ padding: '10px 22px', borderRadius: 9, border: 'none',
                              background: C.accent, color: '#fff', fontFamily: SANS,
                              fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            enter Hollowmere →
          </button>
        </div>
      </div>
    </Win>
  );
}

// ═══════ SCREEN: WRITE MODE ═══════════════════════════════════════════
function S_Write() {
  return (
    <Win width={1100} height={720} title="Lotem · Hollowmere">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" worldKind="private" template="fiction" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px',
                         borderBottom: `1px solid ${C.ruleSoft}`, background: C.paper, gap: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink3 }}>Hollowmere · Manuscript ·</div>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink, fontWeight: 500 }}>The bell-keeper</div>
          <span style={{ flex: 1 }} />
          <ModeToggle value="write" />
          <div style={{ width: 14 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.6 }}>LOCAL</span>
          <div style={{ width: 6, height: 6, borderRadius: 6, background: C.ink4 }} />
        </div>
        <WriteSurface />
      </div>
    </Win>
  );
}

// ═══════ SCREEN: BRAIN DUMP ═══════════════════════════════════════════
function S_Dump() {
  return (
    <Win width={1100} height={720} title="Lotem · Hollowmere · dump">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" worldKind="private" template="fiction"
                activeOverride="2.0" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px',
                         borderBottom: `1px solid ${C.ruleSoft}`, background: C.paper, gap: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink3 }}>Hollowmere · Workshop ·</div>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink, fontWeight: 500 }}>Brain dump</div>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.6, marginLeft: 4 }}>23 UNSORTED</span>
          <span style={{ flex: 1 }} />
          <ModeToggle value="dump" />
          <div style={{ width: 14 }} />
          <button style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.rule}`,
                              background: C.paper2, color: C.ink2, fontFamily: SANS, fontSize: 11,
                              fontWeight: 500, cursor: 'pointer' }}>sort now</button>
        </div>
        <DumpCanvas withSelection />
      </div>
    </Win>
  );
}

// ═══════ SCREEN: SPLIT ════════════════════════════════════════════════
function S_Split() {
  return (
    <Win width={1180} height={720} title="Lotem · Hollowmere · split">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" worldKind="private" template="fiction" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 22px',
                         borderBottom: `1px solid ${C.ruleSoft}`, background: C.paper, gap: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink3 }}>Hollowmere · Manuscript ·</div>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink, fontWeight: 500 }}>The bell-keeper</div>
          <span style={{ flex: 1 }} />
          <ModeToggle value="split" />
          <div style={{ width: 14 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink3, letterSpacing: 0.6 }}>LOCAL</span>
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <WriteSurface compact />
          <div style={{ width: 1, background: C.rule, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: -3, width: 6, height: 36,
                            borderRadius: 4, background: C.paper3,
                            border: `1px solid ${C.rule}`,
                            transform: 'translateY(-50%)' }} />
          </div>
          <DumpCanvas compact />
        </div>
      </div>
    </Win>
  );
}

// ═══════ SCREEN: CO-WRITING ═══════════════════════════════════════════
function S_CoWriting() {
  const sharedAvatars = (
    <>
      <Avatar initial="Y" color={C.accent} ring />
      <Avatar initial="R" color="#3a6aa6" ring offset />
      <Avatar initial="K" color={C.moss} offset />
    </>
  );
  return (
    <Win width={1180} height={720} title="Lotem · Six Doors (shared)">
      <WorldRail active="six" />
      <Sidebar worldName="Six Doors" worldKind="shared" template="six" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 22px',
                         borderBottom: `1px solid ${C.ruleSoft}`, background: C.paper, gap: 10 }}>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink3 }}>Six Doors · Manuscript ·</div>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink, fontWeight: 500 }}>My door — fifth</div>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                          padding: '4px 10px', borderRadius: 999,
                          background: C.mossBg, border: `1px solid ${C.moss}33` }}>
            {sharedAvatars}
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss, letterSpacing: 0.4, marginLeft: 4 }}>
              3 HERE
            </span>
          </div>
          <ModeToggle value="split" size="sm" />
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <WriteSurface compact presence={{ color: '#3a6aa6', name: 'Rae' }} />
          <div style={{ width: 1, background: C.rule }} />
          <DumpCanvas compact presence={{ color: '#3a6aa6', name: 'Rae' }} />
        </div>
        {/* inline chat strip */}
        <div style={{ borderTop: `1px solid ${C.ruleSoft}`, background: C.paper2,
                         padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initial="K" color={C.moss} size={22} />
          <div style={{ fontFamily: SERIF, fontSize: 14, color: C.ink, fontStyle: 'italic' }}>
            "I love the pepper detail. mind if I add a note to Lore?"
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.4 }}>KIT · 2m</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.moss, letterSpacing: 0.6 }}>● KIT EDITING LORE</span>
        </div>
      </div>
    </Win>
  );
}

// ═══════ SCREEN: FEED ═════════════════════════════════════════════════
const FEED_POSTS = [
  { world: 'The Lamp Index', writer: 'R. Maren', title: 'On the bell-keepers of Hollowmere',
    lede: 'A long one. Folk-horror set in a town that worships silence — skip if you\'re tired today.',
    time: '18 min ago', reads: '2 min in', hot: true, sample: PROSE[0] },
  { world: 'Saltvane', writer: 'A. Field', title: 'Tide notes, third',
    lede: 'Brackish at the second sluice. A heron that wasn\'t there yesterday.',
    time: '2 hours ago', reads: '', sample: 'Brackish at the second sluice. Lower than expected by a foot.' },
  { world: 'Six Doors', writer: 'a shared world', title: 'Why I keep two notebooks',
    lede: 'One for what happens, one for what I wish would.',
    time: 'yesterday', reads: '', sample: 'There are two notebooks on my desk and I don\'t recommend the system.' },
];

function S_Feed() {
  return (
    <Win width={1180} height={720} title="Lotem · Feed">
      <WorldRail active={null} />
      <div style={{ width: 232, background: C.paper2, borderRight: `1px solid ${C.ruleSoft}`,
                       padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.8, padding: '4px 8px', marginBottom: 4 }}>
          FOLLOWING
        </div>
        {[
          ['◐', 'The Lamp Index', 2, true],
          ['Λ', 'Saltvane', 1, false],
          ['✦', 'Six Doors', 0, false],
          ['◇', 'Cinder & Marrow', 0, false],
          ['◯', 'a salt letter', 1, false],
        ].map(([g, n, count, active], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '8px 10px', borderRadius: 7,
                                  background: active ? C.card : 'transparent',
                                  border: `1px solid ${active ? C.rule : 'transparent'}` }}>
            <span style={{ fontFamily: SERIF, fontSize: 14, color: active ? C.accent : C.ink3 }}>{g}</span>
            <span style={{ flex: 1, fontSize: 13, color: active ? C.ink : C.ink2,
                            fontWeight: active ? 500 : 400 }}>{n}</span>
            {count > 0 && (
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#fff',
                              background: C.accent, padding: '1px 6px', borderRadius: 10 }}>{count}</span>
            )}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '8px 10px', fontFamily: SANS, fontSize: 12, color: C.ink2,
                        display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${C.ruleSoft}`, marginTop: 8 }}>
          → discover
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: C.paper }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 28px 80px' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 1, marginBottom: 6 }}>
            TUESDAY · MAY 12
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, margin: '0 0 28px',
                          letterSpacing: -0.6, lineHeight: 1 }}>
            From the worlds you live in.
          </h1>
          {FEED_POSTS.map((p, i) => (
            <article key={i} style={{ marginBottom: 32, paddingBottom: 28,
                                          borderBottom: i < 2 ? `1px solid ${C.ruleSoft}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: p.hot ? C.accent : C.ink3, letterSpacing: 0.8 }}>
                  {p.world.toUpperCase()}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4 }}>·</span>
                <span style={{ fontFamily: SERIF, fontSize: 13, color: C.ink3, fontStyle: 'italic' }}>{p.writer}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4 }}>{p.time}</span>
              </div>
              <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: '0 0 10px',
                              letterSpacing: -0.3, lineHeight: 1.15 }}>{p.title}</h2>
              <p style={{ fontFamily: SERIF, fontSize: 16, color: C.ink2, fontStyle: 'italic',
                            lineHeight: 1.55, margin: '0 0 12px' }}>{p.lede}</p>
              <p style={{ fontFamily: SERIF, fontSize: 16, color: C.ink, lineHeight: 1.6, margin: 0 }}>
                {p.sample}
              </p>
              {p.reads && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: C.accent, letterSpacing: 0.6 }}>
                    ↺ CONTINUE · {p.reads}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </Win>
  );
}

// ═══════ SCREEN: DISCOVER ═════════════════════════════════════════════
function S_Discover() {
  return (
    <Win width={1180} height={720} title="Lotem · Discover">
      <WorldRail active={null} />
      <div style={{ flex: 1, overflow: 'auto', background: C.paper, padding: '34px 56px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 28 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, margin: 0,
                          letterSpacing: -0.6, lineHeight: 1 }}>Find a world.</h1>
          <span style={{ fontFamily: SERIF, fontSize: 18, color: C.ink3, fontStyle: 'italic' }}>
            — or a writer worth following.
          </span>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          background: C.card, border: `1px solid ${C.rule}`, borderRadius: 9,
                          padding: '8px 14px', minWidth: 280 }}>
            <span style={{ color: C.ink4, fontFamily: SANS, fontSize: 13 }}>⌕</span>
            <span style={{ fontFamily: SANS, fontSize: 13, color: C.ink4 }}>search a writer or world…</span>
          </div>
        </div>
        {/* highlight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 36 }}>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.rule}`,
                          padding: 22, display: 'flex', gap: 16 }}>
            <Avatar initial="RM" color={C.accent} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.8, marginBottom: 4 }}>
                A WRITER TO KNOW
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>R. Maren</div>
              <p style={{ fontFamily: SERIF, fontSize: 13, color: C.ink2, lineHeight: 1.5, margin: '0 0 14px' }}>
                Three worlds — a folk-horror, a long letter, and a children's bestiary in progress.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none',
                                    background: C.accent, color: '#fff', fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
                  follow
                </button>
                <button style={{ padding: '6px 14px', borderRadius: 7,
                                    background: 'transparent', border: `1px solid ${C.rule}`,
                                    color: C.ink2, fontFamily: SANS, fontSize: 12, fontWeight: 500 }}>
                  peek 3 worlds
                </button>
              </div>
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.rule}`,
                          padding: 22, display: 'flex', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: C.mossBg,
                            color: C.moss, fontFamily: SERIF, fontSize: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `2px solid ${C.paper}` }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.8 }}>A WORLD TO ENTER</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: C.moss, letterSpacing: 0.6,
                                background: C.mossBg, padding: '1px 6px', borderRadius: 4 }}>
                  CO-WRITING OPEN
                </span>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Six Doors</div>
              <p style={{ fontFamily: SERIF, fontSize: 13, color: C.ink2, lineHeight: 1.5, margin: '0 0 14px' }}>
                A shared world tended by six writers. Co-writing room open to applicants.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '6px 14px', borderRadius: 7, border: 'none',
                                    background: C.moss, color: '#fff', fontFamily: SANS, fontSize: 12, fontWeight: 600 }}>
                  apply to co-write
                </button>
                <button style={{ padding: '6px 14px', borderRadius: 7,
                                    background: 'transparent', border: `1px solid ${C.rule}`,
                                    color: C.ink2, fontFamily: SANS, fontSize: 12, fontWeight: 500 }}>
                  follow as reader
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* browse by shape */}
        <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 1, marginBottom: 12 }}>
          BROWSE BY SHAPE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            ['serial fiction', 187, '◐'], ['daily field notes', 92, 'Λ'],
            ['long essays', 144, '⏍'], ['open / shared worlds', 38, '✦'],
            ['poetry', 67, '◌'], ['visual journals', 51, '◯'],
            ['letters', 24, '✎'], ['theses in progress', 19, '∎'],
          ].map(([s, n, g], i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.ruleSoft}`,
                                    borderRadius: 10, padding: '14px 16px',
                                    display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: SERIF, fontSize: 18, color: C.accent }}>{g}</span>
                <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500 }}>{s}</span>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.4 }}>{n} worlds</span>
            </div>
          ))}
        </div>
      </div>
    </Win>
  );
}

// ═══════ BRIEF / SYSTEM NOTE ══════════════════════════════════════════
function Brief() {
  return (
    <div style={{ padding: 36, fontFamily: SERIF, color: C.ink, lineHeight: 1.55,
                    width: '100%', height: '100%', overflow: 'auto', background: C.paper }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.accent, letterSpacing: 1.4, marginBottom: 6 }}>
        LOTEM — HI-FI
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, letterSpacing: -0.5, lineHeight: 1, marginBottom: 14 }}>
        a quiet writer's world,<br/>finally rendered.
      </div>
      <p style={{ fontSize: 14, color: C.ink2, margin: '0 0 18px' }}>
        Built up from the v2 wireframes — Worlds as Rooms, templates, Write/Split/Dump
        modes, co-writing, Substack-shaped social. Same bones; warmer skin.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        {[
          ['Type', 'Newsreader for prose (literary, warm). Inter for chrome. IBM Plex Mono for metadata.'],
          ['Palette', 'Warm paper (#f7f2e5) on a near-black ink. One oxblood accent for action; moss for "synced / shared".'],
          ['Voice', 'Minimal branding — the L mark is one glyph, nothing more. UI defers to whatever the writer wrote.'],
          ['Density', 'Roomy on the writing surface, tight on the metadata. Hierarchy by size + italics, not weight.'],
        ].map(([t, d], i) => (
          <div key={i} style={{ padding: 12, background: C.card, border: `1px solid ${C.ruleSoft}`,
                                  borderRadius: 8 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.ink4, letterSpacing: 0.8, marginBottom: 4 }}>{t.toUpperCase()}</div>
            <div style={{ fontSize: 13, color: C.ink2 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11, color: C.ink3, letterSpacing: 0.4 }}>
        scroll right →  template picker · write · dump · split · co-writing · feed · discover
      </div>
    </div>
  );
}

// ═══════ APP ══════════════════════════════════════════════════════════
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "paper": "warm",
  "accent": "oxblood"
}/*EDITMODE-END*/;

function CenterFrame({ children, bg = '#1f1d18' }) {
  return <div style={{ width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: bg }}>{children}</div>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => {
    const paper = t.paper === 'cool' ? '#f1f0eb' : t.paper === 'dark' ? '#1a1814' : '#f7f2e5';
    document.documentElement.style.setProperty('--paper', paper);
    document.body.style.background = t.paper === 'dark' ? '#0e0c08' : '#1f1d18';
  }, [t.paper]);
  React.useEffect(() => {
    const accents = {
      oxblood: ['#a8412a', '#c66a4f', '#f5dcd2'],
      cobalt:  ['#2b558f', '#4a78b8', '#d8e3ee'],
      ink:     ['#1d1b15', '#43403a', '#e4dfd0'],
    };
    const [a, sa, bg] = accents[t.accent] || accents.oxblood;
    C.accent = a; C.accentSoft = sa; C.accentBg = bg;
  }, [t.accent]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="intro" title="Lotem · hi-fi" subtitle="Warm paper. Newsreader for prose. Oxblood for action.">
          <DCArtboard id="brief" label="brief & system" width={700} height={520}><Brief /></DCArtboard>
        </DCSection>

        <DCSection id="onboard" title="1 · Creating a world" subtitle="Templates shape the room — nothing locked.">
          <DCArtboard id="tpl" label="1.1 · Template picker" width={1100} height={740}>
            <CenterFrame><S_Templates /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="room" title="2 · Inside a room" subtitle="Write · Split · Dump — the three modes of a room.">
          <DCArtboard id="write" label="2.1 · Write" width={1160} height={780}>
            <CenterFrame><S_Write /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="dump" label="2.2 · Brain dump" width={1160} height={780}>
            <CenterFrame><S_Dump /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="split" label="2.3 · Split" width={1240} height={780}>
            <CenterFrame><S_Split /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="co" title="3 · Co-writing" subtitle="A world marked shared. Presence, inline chat, per-section editing.">
          <DCArtboard id="cowrite" label="3.1 · Shared room" width={1240} height={780}>
            <CenterFrame><S_CoWriting /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="social" title="4 · The social layer" subtitle="Substack-shaped, calm. Subscribers follow a world, not a person.">
          <DCArtboard id="feed" label="4.1 · Feed" width={1240} height={780}>
            <CenterFrame><S_Feed /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="disc" label="4.2 · Discover" width={1240} height={780}>
            <CenterFrame><S_Discover /></CenterFrame>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Paper" />
        <TweakRadio label="Tone" value={t.paper}
                    options={['warm', 'cool', 'dark']}
                    onChange={(v) => setTweak('paper', v)} />
        <TweakSection label="Accent" />
        <TweakRadio label="Hue" value={t.accent}
                    options={['oxblood', 'cobalt', 'ink']}
                    onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </>
  );
}

Object.assign(window, {
  C, SERIF, SANS, MONO, Win, WorldRail, Sidebar, ModeToggle, StatusBar, Avatar, TPL, WORLDS,
  WriteSurface, DumpCanvas,
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
