// Lotem · B&W. Rams-influenced. No color, no ornament, hairline rules only.

const BW = {
  white: '#ffffff',
  off:   '#fafafa',
  rule:  '#e5e5e5',
  ruleS: '#f0f0f0',
  ink4:  '#a3a3a3',
  ink3:  '#737373',
  ink2:  '#404040',
  ink:   '#111111',
  black: '#000000',
};

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const SANS  = '"Geist", -apple-system, system-ui, sans-serif';
const MONO  = '"Geist Mono", ui-monospace, monospace';

// ─── window frame ─────────────────────────────────────────────────────
function Win({ width = 1100, height = 720, title, children }) {
  return (
    <div style={{
      width, height, background: BW.white,
      border: `1px solid ${BW.rule}`, borderRadius: 8,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      color: BW.ink, fontFamily: SANS,
      boxShadow: '0 30px 60px -28px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        height: 36, display: 'flex', alignItems: 'center',
        padding: '0 14px', borderBottom: `1px solid ${BW.ruleS}`,
      }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {[0,1,2].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 10,
                                    border: `1px solid ${BW.rule}`, background: BW.white }} />
          ))}
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO,
                        fontSize: 11, color: BW.ink4, letterSpacing: 0.4 }}>{title}</div>
        <div style={{ width: 50 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</div>
    </div>
  );
}

// ─── world rail (collapsible) ─────────────────────────────────────────
const WORLDS = [
  { id: 'lamp',   tag: 'LI', name: 'The Lamp Index' },
  { id: 'hollow', tag: 'HM', name: 'Hollowmere' },
  { id: 'six',    tag: 'SD', name: 'Six Doors', shared: true },
  { id: 'thesis', tag: 'TH', name: 'Thesis' },
];

function WorldRail({ active, focus = false }) {
  if (focus) return null;
  return (
    <div style={{
      width: 56, background: BW.off,
      borderRight: `1px solid ${BW.ruleS}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 0', gap: 4,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 400,
                       color: BW.ink, letterSpacing: -0.5, marginBottom: 10 }}>L</div>
      {WORLDS.map((w) => {
        const isActive = w.id === active;
        return (
          <div key={w.id} title={w.name}
            style={{ width: 36, height: 36, borderRadius: 6,
                       background: isActive ? BW.ink : 'transparent',
                       border: `1px solid ${isActive ? BW.ink : BW.rule}`,
                       color: isActive ? BW.white : BW.ink2,
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontFamily: MONO, fontSize: 10, fontWeight: 500, letterSpacing: 0.4,
                       position: 'relative' }}>
            {w.tag}
            {w.shared && (
              <div style={{ position: 'absolute', top: 2, right: 2,
                              width: 4, height: 4, borderRadius: 4,
                              background: isActive ? BW.white : BW.ink }} />
            )}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ width: 36, height: 36, borderRadius: 6,
                      border: `1px dashed ${BW.rule}`, color: BW.ink4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 300 }}>+</div>
    </div>
  );
}

// ─── sidebar (collapsible) ────────────────────────────────────────────
const TPL = {
  fiction: [
    { label: 'Manuscript', items: [
        { name: 'The bell-keeper', meta: '1,204', active: true },
        { name: 'Chapter 02 — Tollhouse', meta: '618' },
        { name: 'untitled (Tue)', meta: '94' },
    ]},
    { label: 'World', items: [
        { name: 'Characters', meta: '12' },
        { name: 'Places', meta: '7' },
        { name: 'Lore & rules', meta: '23' },
    ]},
    { label: 'Workshop', items: [
        { name: 'Brain dump', meta: '23' },
        { name: 'Sessions', meta: '14d' },
    ]},
  ],
  six: [
    { label: 'Manuscript', items: [
        { name: 'My door — fifth', meta: '2,118', active: true },
        { name: "Rae's door — second", meta: '◌' },
        { name: "Kit's door — third", meta: '4,002' },
    ]},
    { label: 'Shared world', items: [
        { name: 'Characters', meta: '24' },
        { name: 'Places', meta: '11' },
        { name: 'Common lore', meta: '◌ Kit' },
    ]},
    { label: 'Together', items: [
        { name: 'Chat', meta: '3' },
        { name: 'Brain dump', meta: '88' },
    ]},
  ],
  humanities: [
    { label: 'Manuscript', items: [
        { name: 'Silence as governance', meta: '8,402', active: true },
        { name: 'Working argument', meta: '2,114' },
        { name: 'Outline v2', meta: '—' },
    ]},
    { label: 'Sources', items: [
        { name: 'Primary texts', meta: '14' },
        { name: 'Secondary lit.', meta: '47' },
        { name: 'Citations', meta: '83' },
    ]},
    { label: 'Arguments', items: [
        { name: 'Thesis', meta: '◇' },
        { name: 'Counter-args', meta: '6' },
        { name: 'Open questions', meta: '11' },
    ]},
    { label: 'Workshop', items: [
        { name: 'Brain dump', meta: '41' },
        { name: 'Sessions', meta: '21d' },
    ]},
  ],
  technical: [
    { label: 'Report', items: [
        { name: 'scRNA-seq report', meta: '4,218', active: true },
        { name: 'Abstract', meta: '264' },
        { name: 'Methods', meta: '1,108' },
        { name: 'Results & figs', meta: '2,002' },
    ]},
    { label: 'Data & figures', items: [
        { name: 'Datasets', meta: '7' },
        { name: 'Figures', meta: '12' },
        { name: 'Tables', meta: '4' },
        { name: 'Notebooks', meta: '3' },
    ]},
    { label: 'Code & math', items: [
        { name: 'Snippets', meta: '18' },
        { name: 'Equations', meta: '6' },
        { name: 'References', meta: '46' },
    ]},
    { label: 'Workshop', items: [
        { name: 'Brain dump', meta: '29' },
        { name: 'Sessions', meta: '11d' },
    ]},
  ],
};

function Sidebar({ worldName, shared, template = 'fiction', focus = false, activeOverride }) {
  if (focus) return null;
  const sections = TPL[template] || TPL.fiction;
  return (
    <div style={{
      width: 224, background: BW.off,
      borderRight: `1px solid ${BW.ruleS}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BW.ruleS}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500, color: BW.ink,
                         letterSpacing: -0.2 }}>{worldName}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3,
                         letterSpacing: 0.4, marginTop: 4 }}>
          {shared ? 'SHARED · 3 WRITERS' : 'PRIVATE · LOCAL'}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
        {sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ padding: '8px 20px 4px', fontFamily: MONO, fontSize: 9,
                            color: BW.ink4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {sec.label}
            </div>
            {sec.items.map((it, j) => {
              const isActive = activeOverride ? activeOverride === `${i}.${j}` : it.active;
              return (
                <div key={j} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '6px 20px', gap: 8,
                  background: isActive ? BW.white : 'transparent',
                  borderLeft: `2px solid ${isActive ? BW.ink : 'transparent'}`,
                  marginLeft: -1,
                }}>
                  <span style={{ flex: 1, fontFamily: SANS, fontSize: 13,
                                   color: isActive ? BW.ink : BW.ink2,
                                   fontWeight: isActive ? 500 : 400 }}>{it.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4 }}>{it.meta}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${BW.ruleS}`, padding: '12px 20px',
                      display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4 }}>
          22:14
        </span>
        <span style={{ width: 1, height: 10, background: BW.rule }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4 }}>
          14d
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 0.4 }}>⌘K</span>
      </div>
    </div>
  );
}

// ─── focus rail (used when focus mode is on) ─────────────────────────
function FocusRail({ active }) {
  return (
    <div style={{ width: 36, background: BW.white, borderRight: `1px solid ${BW.ruleS}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '14px 0', gap: 14 }}>
      <div style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 400 }}>L</div>
      <div style={{ width: 16, height: 1, background: BW.rule }} />
      {WORLDS.map((w) => (
        <div key={w.id} style={{ width: 4, height: 4, borderRadius: 4,
                                    background: w.id === active ? BW.ink : BW.rule }} />
      ))}
    </div>
  );
}

// ─── mode toggle (text-based, underlined) ────────────────────────────
function ModeToggle({ value = 'write', focus = false }) {
  const modes = ['write', 'split', 'dump'];
  if (focus) {
    return (
      <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.8 }}>
        ⤢ FOCUS
      </span>
    );
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
      {modes.map((m) => {
        const active = m === value;
        return (
          <span key={m} style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 500,
            color: active ? BW.ink : BW.ink4,
            borderBottom: `1px solid ${active ? BW.ink : 'transparent'}`,
            paddingBottom: 2, letterSpacing: 0.2,
          }}>{m}</span>
        );
      })}
    </div>
  );
}

function Avatar({ initial, size = 22, dark = false, offset = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size, marginLeft: offset ? -6 : 0,
      background: dark ? BW.ink : BW.white,
      color: dark ? BW.white : BW.ink,
      border: `1px solid ${BW.ink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MONO, fontSize: size * 0.4, fontWeight: 500,
    }}>{initial}</div>
  );
}

// ─── write surface ────────────────────────────────────────────────────
const PROSE = [
  "The bell-keeper rang on the wrong morning.",
  "There were rules about this. Father Ellom kept them in a book the colour of pepper, and the book was supposed to live on the second shelf above the basin where Mira's mother had once kept the salt, and the salt was supposed to live in a jar that nobody touched until the ninth day of the month. None of these things were in their right places anymore.",
  "Mira walked the long way around the square. She did not look at the tower, because the tower had not been wrong in eighty-one years and she did not want to be the one to notice.",
  "The bell rang again. She counted: one, two, three. It should have been seven.",
];

function WriteSurface({ compact = false, focus = false, breadcrumb }) {
  const maxW = focus ? 620 : compact ? 480 : 640;
  const padV = focus ? '100px 32px 120px' : compact ? '40px 28px 80px' : '64px 40px 100px';
  return (
    <div style={{ flex: 1, minWidth: 0, background: BW.white,
                    overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: maxW, margin: '0 auto', padding: padV }}>
          {!focus && breadcrumb && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4,
                            letterSpacing: 0.8, marginBottom: 20 }}>{breadcrumb}</div>
          )}
          <h1 style={{ fontFamily: SERIF, fontSize: compact ? 28 : 36, fontWeight: 400,
                          lineHeight: 1.1, margin: '0 0 6px', letterSpacing: -0.6, color: BW.ink }}>
            The bell-keeper's last morning
          </h1>
          {!focus && (
            <div style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3,
                            fontStyle: 'italic', marginBottom: 28 }}>
              a draft · 1,204 words
            </div>
          )}
          {focus && <div style={{ height: 28 }} />}
          {PROSE.map((p, i) => (
            <p key={i} style={{ fontFamily: SERIF, fontSize: compact ? 16 : 18,
                                  lineHeight: 1.6, color: BW.ink2,
                                  margin: '0 0 1.1em', textWrap: 'pretty' }}>{p}</p>
          ))}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BW.ruleS}`, background: BW.white,
                      padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 16,
                      opacity: focus ? 0.5 : 1 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>
          1,204 / 1,500
        </span>
        <div style={{ width: 80, height: 2, background: BW.ruleS }}>
          <div style={{ width: '80%', height: '100%', background: BW.ink }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>
          22:14
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.6 }}>
          ⌘K
        </span>
        <button style={{ padding: '6px 14px', borderRadius: 0, border: `1px solid ${BW.ink}`,
                            background: BW.ink, color: BW.white,
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.4 }}>
          publish →
        </button>
      </div>
    </div>
  );
}

// ─── dump canvas (B&W) ────────────────────────────────────────────────
const DUMP_NODES = [
  { l: 32, t: 32, w: 196, h: 76, kind: 'note',
    title: '', body: 'bell rings on the wrong morning — is it her, or is the town slipping?' },
  { l: 248, t: 36, w: 168, h: 76, kind: 'char',
    title: 'Mira Voss', body: '34. bell-keeper since her mother. doesn\'t want this.' },
  { l: 32, t: 122, w: 184, h: 64, kind: 'note',
    title: '', body: 'priest\'s coat smells of pepper. why? keep, even if unused.' },
  { l: 236, t: 130, w: 180, h: 82, kind: 'place',
    title: 'The Tollhouse', body: 'crossroads, west. older than the bell. a door that opens both ways.' },
  { l: 436, t: 56, w: 152, h: 56, kind: 'note',
    title: '', body: '"she was already late" — opener?' },
  { l: 32, t: 200, w: 260, h: 60, kind: 'lore',
    title: 'The Long Quiet', body: 'year 0 of the calendar. nobody remembers it. that\'s the rule.' },
  { l: 312, t: 226, w: 152, h: 64, kind: 'char',
    title: 'a child', body: 'collects silences. unnamed.' },
];

function DumpCanvas({ compact = false, withSelection = false }) {
  return (
    <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
                    background: BW.white,
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${BW.rule} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px' }}>
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d="M 140 80 Q 220 50, 320 70" stroke={BW.rule} strokeWidth={1} fill="none" strokeDasharray="2 3" />
        <path d="M 320 110 Q 340 170, 322 180" stroke={BW.rule} strokeWidth={1} fill="none" strokeDasharray="2 3" />
      </svg>
      {DUMP_NODES.map((n, i) => {
        const selected = withSelection && i === 0;
        return (
          <div key={i} style={{
            position: 'absolute', left: n.l, top: n.t, width: n.w, minHeight: n.h,
            background: BW.white,
            border: `1px solid ${selected ? BW.ink : BW.rule}`,
            outline: selected ? `2px solid ${BW.ink}` : 'none',
            outlineOffset: 2,
            padding: '8px 10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontFamily: MONO, fontSize: 8, color: BW.ink4,
                              letterSpacing: 1, textTransform: 'uppercase' }}>{n.kind}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: MONO, fontSize: 8, color: BW.ink4 }}>
                {['mon','tue','wed','thu','fri','sat','sun'][i] || 'now'}
              </span>
            </div>
            {n.title && (
              <div style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 500, color: BW.ink, marginBottom: 2 }}>
                {n.title}
              </div>
            )}
            <div style={{ fontFamily: SERIF, fontSize: 12, color: BW.ink2, lineHeight: 1.35,
                             fontStyle: n.kind === 'note' ? 'italic' : 'normal' }}>
              {n.body}
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                      background: BW.white, border: `1px solid ${BW.ink}`,
                      padding: '6px 4px', display: 'flex', gap: 0 }}>
        {['thought', 'person', 'place', 'lore'].map((l, i) => (
          <span key={i} style={{ padding: '4px 12px',
                                    fontFamily: SANS, fontSize: 11, fontWeight: i === 0 ? 500 : 400,
                                    color: i === 0 ? BW.ink : BW.ink3,
                                    borderRight: i < 3 ? `1px solid ${BW.ruleS}` : 'none' }}>
            + {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN: TEMPLATES ────────────────────────────────────────────────
function S_Templates() {
  const cards = [
    ['fiction',  'Fictional writing', 'novel · short story · script',
     'Manuscript · Characters · Places · Lore · Brain dump', true],
    ['thesis',   'Thesis · research', 'long-form academic',
     'Manuscript · Sources · Arguments · Outline', false],
    ['serial',   'Serial', 'recurring essays · newsletter',
     'Issues · Recurring people · Calendar', false],
    ['journal',  'Journal', 'daily, low-stakes',
     'Daily · Themes · Seedlings · Streak', false],
    ['blank',    'Blank', 'start from nothing',
     'one empty page', false],
  ];
  return (
    <Win width={1040} height={680} title="new world">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                       background: BW.white, padding: '48px 64px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1.2, marginBottom: 12 }}>
            01 — A KIND OF ROOM
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 400, margin: 0,
                          lineHeight: 1, letterSpacing: -1, color: BW.ink }}>
            What kind of world<br/>
            <span style={{ fontStyle: 'italic', color: BW.ink3 }}>are you starting?</span>
          </h1>
        </div>
        <div style={{ borderTop: `1px solid ${BW.rule}` }}>
          {cards.map(([key, name, sub, kit, active], i) => (
            <div key={key} style={{
              display: 'grid', gridTemplateColumns: '32px 220px 1fr 32px',
              alignItems: 'center', gap: 24, padding: '18px 0',
              borderBottom: `1px solid ${BW.rule}`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.4 }}>
                0{i+1}
              </div>
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: BW.ink,
                                 letterSpacing: -0.2 }}>{name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4, marginTop: 4 }}>
                  {sub}
                </div>
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2, fontStyle: 'italic', lineHeight: 1.5 }}>
                {kit}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {active ? (
                  <div style={{ width: 22, height: 22, borderRadius: 22, background: BW.ink,
                                  color: BW.white, fontSize: 12,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: 22, border: `1px solid ${BW.rule}` }} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1.2 }}>02 — NAME IT</span>
          <input defaultValue="Hollowmere" style={{
            border: 'none', background: 'transparent', outline: 'none',
            fontFamily: SERIF, fontSize: 22, fontWeight: 500, color: BW.ink,
            borderBottom: `1px solid ${BW.ink}`, padding: '4px 2px', minWidth: 200, letterSpacing: -0.2,
          }} />
          <span style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: SANS, fontSize: 12, color: BW.ink2 }}>
            <span style={{ width: 28, height: 16, borderRadius: 16, background: BW.ink,
                            position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', top: 2, left: 14, width: 12, height: 12,
                              borderRadius: 12, background: BW.white }} />
            </span>
            cloud sync — <span style={{ color: BW.ink4 }}>off, local</span>
          </label>
          <button style={{ padding: '10px 22px', border: `1px solid ${BW.ink}`, borderRadius: 0,
                              background: BW.ink, color: BW.white, fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', letterSpacing: 0.4 }}>
            enter Hollowmere →
          </button>
        </div>
      </div>
    </Win>
  );
}

// ─── SCREEN: WRITE ────────────────────────────────────────────────────
function S_Write({ focus = false }) {
  if (focus) {
    return (
      <Win width={1100} height={720} title="hollowmere · the bell-keeper">
        <FocusRail active="hollow" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <WriteSurface focus />
        </div>
      </Win>
    );
  }
  return (
    <Win width={1100} height={720} title="lotem · hollowmere">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" template="fiction" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Manuscript /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>The bell-keeper</span>
          <span style={{ flex: 1 }} />
          <ModeToggle value="write" />
          <span style={{ width: 1, height: 14, background: BW.rule, marginLeft: 4 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>LOCAL</span>
        </div>
        <WriteSurface breadcrumb="HOLLOWMERE / MANUSCRIPT / CH 1" />
      </div>
    </Win>
  );
}

// ─── SCREEN: DUMP ─────────────────────────────────────────────────────
function S_Dump() {
  return (
    <Win width={1100} height={720} title="lotem · hollowmere · dump">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" template="fiction" activeOverride="2.0" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Workshop /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>Brain dump</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.6 }}>23 UNSORTED</span>
          <span style={{ flex: 1 }} />
          <ModeToggle value="dump" />
          <span style={{ width: 1, height: 14, background: BW.rule }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink2,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>sort now</span>
        </div>
        <DumpCanvas withSelection />
      </div>
    </Win>
  );
}

// ─── SCREEN: SPLIT ────────────────────────────────────────────────────
function S_Split() {
  return (
    <Win width={1200} height={720} title="lotem · hollowmere · split">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" template="fiction" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Manuscript /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>The bell-keeper</span>
          <span style={{ flex: 1 }} />
          <ModeToggle value="split" />
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <WriteSurface compact />
          <div style={{ width: 1, background: BW.rule }} />
          <DumpCanvas compact />
        </div>
      </div>
    </Win>
  );
}

// ─── SCREEN: CO-WRITING ───────────────────────────────────────────────
function S_CoWriting() {
  return (
    <Win width={1200} height={720} title="lotem · six doors (shared)">
      <WorldRail active="six" />
      <Sidebar worldName="Six Doors" shared template="six" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Manuscript /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>My door — fifth</span>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar initial="Y" dark />
            <Avatar initial="R" offset />
            <Avatar initial="K" offset />
            <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6, marginLeft: 4 }}>3 HERE</span>
          </div>
          <span style={{ width: 1, height: 14, background: BW.rule }} />
          <ModeToggle value="split" />
        </div>
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <WriteSurface compact />
          <div style={{ width: 1, background: BW.rule }} />
          <DumpCanvas compact />
        </div>
        <div style={{ borderTop: `1px solid ${BW.ruleS}`, padding: '12px 24px',
                         display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar initial="K" size={20} />
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontStyle: 'italic' }}>
            "I love the pepper detail. mind if I add a note to Lore?"
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.4 }}>KIT · 2m</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>KIT EDITING LORE</span>
        </div>
      </div>
    </Win>
  );
}

// ─── SCREEN: FEED ─────────────────────────────────────────────────────
const FEED_POSTS = [
  { world: 'THE LAMP INDEX', writer: 'R. Maren', title: 'On the bell-keepers of Hollowmere',
    lede: 'A long one. Folk-horror set in a town that worships silence.',
    time: '18 MIN', cont: '2 min in' },
  { world: 'SALTVANE', writer: 'A. Field', title: 'Tide notes, third',
    lede: 'Brackish at the second sluice. A heron that wasn\'t there yesterday.',
    time: '2 HRS' },
  { world: 'SIX DOORS', writer: 'a shared world', title: 'Why I keep two notebooks',
    lede: 'One for what happens, one for what I wish would.',
    time: 'YESTERDAY' },
];

function S_Feed() {
  return (
    <Win width={1200} height={720} title="lotem · feed">
      <WorldRail />
      <div style={{ width: 224, background: BW.off, borderRight: `1px solid ${BW.ruleS}`,
                       padding: '20px 0' }}>
        <div style={{ padding: '8px 20px', fontFamily: MONO, fontSize: 10,
                         color: BW.ink4, letterSpacing: 0.8 }}>FOLLOWING</div>
        {[
          ['The Lamp Index', 2, true],
          ['Saltvane', 1, false],
          ['Six Doors', 0, false],
          ['Cinder & Marrow', 0, false],
          ['a salt letter', 1, false],
        ].map(([n, c, a], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 20px', gap: 8,
                                  borderLeft: `2px solid ${a ? BW.ink : 'transparent'}`,
                                  marginLeft: -1,
                                  background: a ? BW.white : 'transparent' }}>
            <span style={{ flex: 1, fontFamily: SANS, fontSize: 13,
                            color: a ? BW.ink : BW.ink2, fontWeight: a ? 500 : 400 }}>{n}</span>
            {c > 0 && <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink }}>{c}</span>}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: BW.white }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 80px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1.2, marginBottom: 8 }}>
            TUESDAY · MAY 12
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, margin: '0 0 36px',
                          letterSpacing: -0.8, lineHeight: 1.05, color: BW.ink }}>
            From the worlds<br/>
            <span style={{ fontStyle: 'italic', color: BW.ink3 }}>you live in.</span>
          </h1>
          {FEED_POSTS.map((p, i) => (
            <article key={i} style={{ marginBottom: 28, paddingBottom: 24,
                                          borderBottom: i < 2 ? `1px solid ${BW.ruleS}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 1 }}>{p.world}</span>
                <span style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink3, fontStyle: 'italic' }}>{p.writer}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.6 }}>{p.time}</span>
              </div>
              <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 500, margin: '0 0 10px',
                              letterSpacing: -0.4, lineHeight: 1.15, color: BW.ink }}>{p.title}</h2>
              <p style={{ fontFamily: SERIF, fontSize: 16, color: BW.ink2,
                            lineHeight: 1.55, margin: 0, textWrap: 'pretty' }}>{p.lede}</p>
              {p.cont && (
                <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10,
                                color: BW.ink, letterSpacing: 0.6 }}>
                  ↺ CONTINUE — {p.cont}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </Win>
  );
}

// ─── SCREEN: DISCOVER ─────────────────────────────────────────────────
function S_Discover() {
  return (
    <Win width={1200} height={720} title="lotem · discover">
      <WorldRail />
      <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '40px 64px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 36 }}>
          <h1 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, margin: 0,
                          letterSpacing: -0.8, lineHeight: 1, color: BW.ink }}>
            Find a world.
          </h1>
          <span style={{ fontFamily: SERIF, fontSize: 18, color: BW.ink3, fontStyle: 'italic' }}>
            Or a writer worth following.
          </span>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                          borderBottom: `1px solid ${BW.ink}`, padding: '6px 4px', minWidth: 260 }}>
            <span style={{ fontFamily: SANS, fontSize: 14, color: BW.ink4 }}>⌕</span>
            <span style={{ fontFamily: SANS, fontSize: 13, color: BW.ink4 }}>search a writer or world…</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 40,
                         borderTop: `1px solid ${BW.rule}`, borderBottom: `1px solid ${BW.rule}` }}>
          <div style={{ padding: '24px 24px 24px 0', borderRight: `1px solid ${BW.rule}` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 12 }}>
              A WRITER TO KNOW
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Avatar initial="RM" size={48} dark />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, marginBottom: 6,
                                 letterSpacing: -0.4, color: BW.ink }}>R. Maren</div>
                <p style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2, lineHeight: 1.5, margin: '0 0 14px' }}>
                  Three worlds — a folk-horror, a long letter, and a children's bestiary in progress.
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink, fontWeight: 500,
                                   borderBottom: `1px solid ${BW.ink}`, paddingBottom: 2 }}>follow</span>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink3 }}>peek 3 worlds →</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '24px 0 24px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1 }}>A WORLD TO ENTER</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: BW.ink, letterSpacing: 0.6,
                              border: `1px solid ${BW.ink}`, padding: '1px 6px' }}>CO-WRITING OPEN</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ width: 48, height: 48, border: `1px solid ${BW.ink}`,
                              color: BW.ink, fontFamily: SERIF, fontSize: 22,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SD</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 500, marginBottom: 6,
                                 letterSpacing: -0.4, color: BW.ink }}>Six Doors</div>
                <p style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2, lineHeight: 1.5, margin: '0 0 14px' }}>
                  A shared world tended by six writers. Co-writing room open to applicants.
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink, fontWeight: 500,
                                   borderBottom: `1px solid ${BW.ink}`, paddingBottom: 2 }}>apply to co-write</span>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink3 }}>follow as reader →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1.2, marginBottom: 14 }}>
          BROWSE BY SHAPE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                         borderTop: `1px solid ${BW.rule}`, borderLeft: `1px solid ${BW.rule}` }}>
          {[
            ['serial fiction', 187], ['daily field notes', 92],
            ['long essays', 144], ['open / shared worlds', 38],
            ['poetry', 67], ['visual journals', 51],
            ['letters', 24], ['theses in progress', 19],
          ].map(([s, n], i) => (
            <div key={i} style={{ padding: '16px 18px',
                                    borderRight: `1px solid ${BW.rule}`, borderBottom: `1px solid ${BW.rule}` }}>
              <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: BW.ink, letterSpacing: -0.2 }}>{s}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.4, marginTop: 4 }}>
                {n} worlds
              </div>
            </div>
          ))}
        </div>
      </div>
    </Win>
  );
}

// ═══════ ANNOTATION PRIMITIVES ═══════════════════════════════════════
// modes: 'off' | 'highlights' | 'inline' | 'side' | 'both'

function HL({ children, anno = 'off' }) {
  const on = anno !== 'off';
  return <span style={{
    background: on ? '#f0f0f0' : 'transparent',
    boxShadow: on ? `inset 0 -1px 0 ${BW.ink}` : 'none',
    padding: on ? '0 2px' : 0,
    transition: 'background 200ms',
  }}>{children}</span>;
}

function CmtMark({ n, anno = 'off' }) {
  const show = anno === 'inline' || anno === 'both';
  if (!show) return null;
  return (
    <sup style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500,
                    background: BW.ink, color: BW.white,
                    padding: '1px 4px', margin: '0 2px',
                    verticalAlign: '0.4em', letterSpacing: 0.4 }}>{n}</sup>
  );
}

function SideCmt({ n, author, time, body, top }) {
  return (
    <div style={{ position: 'absolute', top, right: 24, width: 196,
                    paddingLeft: 14, borderLeft: `1px solid ${BW.rule}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, color: BW.white,
                        background: BW.ink, padding: '1px 5px', letterSpacing: 0.4 }}>{n}</span>
        <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink, fontWeight: 500 }}>{author}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: BW.ink4, letterSpacing: 0.4, marginLeft: 'auto' }}>{time}</span>
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 12, color: BW.ink2, lineHeight: 1.45, fontStyle: 'italic' }}>
        {body}
      </div>
    </div>
  );
}

// settings popover for annotations
function AnnoPanel({ anno, setAnno, top = 70, right = 24 }) {
  const opts = [
    ['off', 'Off'],
    ['highlights', 'Highlights only'],
    ['inline', 'Comments — inline'],
    ['side', 'Comments — margin'],
    ['both', 'Both — inline + margin'],
  ];
  return (
    <div style={{ position: 'absolute', top, right, width: 240,
                    background: BW.white, border: `1px solid ${BW.ink}`,
                    fontFamily: SANS, zIndex: 10 }}>
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BW.rule}`,
                       display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: BW.ink }}>ANNOTATIONS</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>×</span>
      </div>
      {opts.map(([id, label]) => {
        const active = anno === id;
        return (
          <div key={id} onClick={() => setAnno && setAnno(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10,
                       padding: '8px 14px', cursor: 'pointer',
                       background: active ? BW.off : 'transparent' }}>
            <span style={{ width: 12, height: 12, borderRadius: 12,
                            border: `1px solid ${BW.ink}`,
                            background: active ? BW.ink : 'transparent',
                            boxShadow: active ? `inset 0 0 0 2px ${BW.white}` : 'none' }} />
            <span style={{ fontSize: 12, color: BW.ink, fontWeight: active ? 500 : 400 }}>{label}</span>
          </div>
        );
      })}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${BW.rule}` }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: BW.ink3, marginBottom: 8 }}>FILTER</div>
        {[['me', 3, true], ['supervisor', 7, true], ['peer review', 12, false]].map(([n, c, on]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <span style={{ width: 12, height: 12, border: `1px solid ${BW.ink}`,
                            background: on ? BW.ink : 'transparent',
                            color: BW.white, fontSize: 9, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {on ? '✓' : ''}
            </span>
            <span style={{ fontSize: 12, color: BW.ink2, flex: 1 }}>{n}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4 }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════ HUMANITIES SURFACE ═══════════════════════════════════════════
function HumanitiesSurface({ anno = 'off' }) {
  const showSide = anno === 'side' || anno === 'both';
  const maxW = showSide ? 460 : 620;
  return (
    <div style={{ flex: 1, minWidth: 0, background: BW.white,
                    overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ maxWidth: maxW, padding: '56px 32px 60px 56px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.8, marginBottom: 18 }}>
            THESIS / MANUSCRIPT / CH 2
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 400,
                          lineHeight: 1.1, margin: '0 0 6px', letterSpacing: -0.6, color: BW.ink }}>
            Silence as governance
          </h1>
          <div style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3,
                          fontStyle: 'italic', marginBottom: 32 }}>
            Reading Bartleby's refusal · 8,402 words
          </div>

          <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em', textWrap: 'pretty' }}>
            Melville's scrivener does not refuse so much as <em>withdraw</em>. <HL anno={anno}>His preferred-not-to is a syntax that empties the imperative of its addressee</HL><CmtMark n="1" anno={anno} /> — the office, organized around the production of copies, cannot metabolize a worker who copies nothing, asks for nothing, complains of nothing.<sup style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3 }}>1</sup>
          </p>

          <blockquote style={{ fontFamily: SERIF, fontSize: 18, color: BW.ink,
                                  fontStyle: 'italic', lineHeight: 1.5,
                                  borderLeft: `2px solid ${BW.ink}`,
                                  padding: '4px 20px', margin: '24px 0' }}>
            The clerk's refusal — neither yes nor no — is the purest form of authority delegated to silence. We hear ourselves repeating it.
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4,
                            letterSpacing: 0.4, marginTop: 10, fontStyle: 'normal' }}>
              — ANON., A PAMPHLET ON THE OFFICE · 1854
            </div>
          </blockquote>

          <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em', textWrap: 'pretty' }}>
            What this scene names, well before Foucault<sup style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3 }}>2</sup>, is the <HL anno={anno}>disciplinary effect of a withdrawal that cannot be punished</HL><CmtMark n="2" anno={anno} />. The desk becomes a site at which power, having no object to refuse, is forced to perform itself.
          </p>

          <div style={{ borderTop: `1px solid ${BW.rule}`, marginTop: 36, paddingTop: 18 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink3, letterSpacing: 0.8, marginBottom: 10 }}>NOTES</div>
            <ol style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink2, lineHeight: 1.6, paddingLeft: 18, margin: 0 }}>
              <li>On the grammar of refusal, see Agamben, <em>Potentialities</em> (1999), pp. 243–271.</li>
              <li>Foucault, <em>Discipline and Punish</em>, ch. 3.</li>
            </ol>
          </div>

          {showSide && (
            <>
              <SideCmt n="1" author="Prof. Hale" time="2d" top={210}
                body="Lovely word, 'metabolize'. Cite the org-studies usage?" />
              <SideCmt n="2" author="me" time="4h" top={460}
                body="am I doing Foucault's work for him here? sit with this." />
            </>
          )}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BW.ruleS}`, padding: '10px 22px',
                      display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>8,402 / 10,000</span>
        <div style={{ width: 80, height: 2, background: BW.ruleS }}>
          <div style={{ width: '84%', height: '100%', background: BW.ink }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>21:08</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 0.6,
                          borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>
          ⌥A annotations
        </span>
      </div>
    </div>
  );
}

// ═══════ TECHNICAL SURFACE ════════════════════════════════════════════
function MathVar({ children }) {
  return <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.02em' }}>{children}</span>;
}

function TechnicalSurface({ anno = 'off' }) {
  const showSide = anno === 'side' || anno === 'both';
  const maxW = showSide ? 460 : 620;
  return (
    <div style={{ flex: 1, minWidth: 0, background: BW.white,
                    overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <div style={{ maxWidth: maxW, padding: '48px 32px 60px 56px' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.8, marginBottom: 18 }}>
            CS 562 / REPORT / §3 RESULTS
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500,
                          lineHeight: 1.15, margin: '0 0 6px', letterSpacing: -0.4, color: BW.ink }}>
            Detecting cell-state transitions in single-cell RNA-seq data
          </h1>
          <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4, marginBottom: 28 }}>
            Y. KIM · BIOINFORMATICS 470 · 4,218 WORDS · DRAFT 03
          </div>

          <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
            We applied <code style={{ fontFamily: MONO, fontSize: 13, background: BW.off, padding: '1px 4px' }}>scVelo</code>'s dynamical model <span style={{ fontFamily: MONO, fontSize: 12, color: BW.ink }}>[Bergen et&nbsp;al. 2020]</span> to 12,840 cells from mouse dentate gyrus. <HL anno={anno}>The transcriptional dynamics resolve along a latent time axis</HL><CmtMark n="1" anno={anno} /> consistent with previously reported lineage progression (Fig.&nbsp;3).
          </p>

          {/* figure */}
          <figure style={{ margin: '22px 0', border: `1px solid ${BW.rule}` }}>
            <div style={{ height: 160, background: `repeating-linear-gradient(45deg, ${BW.off} 0 8px, ${BW.white} 8px 16px)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {/* UMAP-ish blobs */}
              <svg width="100%" height="100%" viewBox="0 0 400 160" style={{ position: 'absolute', inset: 0 }}>
                {Array.from({length: 80}).map((_, i) => {
                  const cx = 80 + (i * 37) % 280;
                  const cy = 30 + (i * 23 + (i*7)%40) % 100;
                  const v = (i * 17) % 100 / 100;
                  return <circle key={i} cx={cx} cy={cy} r={2.2}
                    fill={v < 0.33 ? BW.ink4 : v < 0.66 ? BW.ink2 : BW.ink} opacity={0.85} />;
                })}
              </svg>
            </div>
            <figcaption style={{ padding: '8px 12px', borderTop: `1px solid ${BW.rule}`,
                                    fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4,
                                    display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ color: BW.ink, fontWeight: 500 }}>FIG. 3</span>
              <span style={{ fontFamily: SERIF, fontSize: 12, fontStyle: 'italic', color: BW.ink2, letterSpacing: 0 }}>
                UMAP of 12,840 cells, coloured by inferred latent time.
              </span>
            </figcaption>
          </figure>

          <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
            Per-gene velocity is modelled as the residual between unspliced and spliced transcript dynamics:
          </p>

          {/* equation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '18px 0 8px', gap: 16, padding: '14px 0' }}>
            <div style={{ flex: 1, textAlign: 'center', fontFamily: SERIF, fontSize: 20, color: BW.ink }}>
              <MathVar>ds<sub style={{ fontSize: '0.7em' }}>j</sub></MathVar>
              <span style={{ margin: '0 4px' }}>/</span>
              <MathVar>dt</MathVar>
              <span style={{ margin: '0 12px' }}>=</span>
              <MathVar>u<sub style={{ fontSize: '0.7em' }}>j</sub></MathVar>
              <span style={{ margin: '0 8px' }}>−</span>
              <MathVar>γ<sub style={{ fontSize: '0.7em' }}>j</sub> · s<sub style={{ fontSize: '0.7em' }}>j</sub></MathVar>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4 }}>(2)</div>
          </div>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, color: BW.ink3,
                          letterSpacing: 0.4, marginBottom: 24 }}>
            EQ. 2 — RNA VELOCITY FOR GENE <span style={{ fontFamily: SERIF, fontStyle: 'italic' }}>j</span>
          </div>

          <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
            The estimator <MathVar>γ<sub style={{ fontSize: '0.7em' }}>j</sub></MathVar> is fit per gene by maximum likelihood under the steady-state assumption. <HL anno={anno}>This is unstable for low-expression genes</HL><CmtMark n="2" anno={anno} /> and we filter at <code style={{ fontFamily: MONO, fontSize: 13, background: BW.off, padding: '1px 4px' }}>min_counts ≥ 20</code>.
          </p>

          {/* code block */}
          <pre style={{ background: BW.off, border: `1px solid ${BW.rule}`,
                          padding: '14px 16px', margin: '14px 0 4px',
                          fontFamily: MONO, fontSize: 12, color: BW.ink, lineHeight: 1.55,
                          overflow: 'auto' }}>
{`import scvelo as scv

adata = scv.datasets.dentategyrus()
scv.pp.filter_and_normalize(adata, min_shared_counts=20)
scv.tl.recover_dynamics(adata)
scv.tl.velocity(adata, mode="dynamical")
scv.pl.velocity_embedding_stream(adata, basis="umap")`}
          </pre>
          <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink3, letterSpacing: 0.4, marginBottom: 20 }}>
            LISTING 1 · methods/velocity.py
          </div>

          {showSide && (
            <>
              <SideCmt n="1" author="supervisor" time="1d" top={290}
                body="Make sure to credit Manno et al. (2018) — the original RNA velocity paper. Add to refs." />
              <SideCmt n="2" author="me" time="now" top={580}
                body="show this instability in a supplementary figure? Fig S2." />
            </>
          )}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BW.ruleS}`, padding: '10px 22px',
                      display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>4,218 / 5,000</span>
        <div style={{ width: 80, height: 2, background: BW.ruleS }}>
          <div style={{ width: '84%', height: '100%', background: BW.ink }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, letterSpacing: 0.4 }}>14:32</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 0.6,
                          borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>
          ⌥A annotations
        </span>
      </div>
    </div>
  );
}

// ═══════ SCREEN: HUMANITIES ROOM (with annotation panel) ─────────────
function S_HumanitiesRoom({ anno: forcedAnno, showPanel = false }) {
  const [annoState, setAnno] = React.useState(forcedAnno || 'side');
  const anno = forcedAnno || annoState;
  return (
    <Win width={1240} height={780} title="lotem · thesis">
      <WorldRail active="thesis" />
      <Sidebar worldName="Silence as governance" template="humanities" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Manuscript /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>Silence as governance</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink2,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>annotations: {anno}</span>
          <ModeToggle value="write" />
        </div>
        <HumanitiesSurface anno={anno} />
        {showPanel && <AnnoPanel anno={anno} setAnno={setAnno} />}
      </div>
    </Win>
  );
}

// ═══════ SCREEN: TECHNICAL ROOM ───────────────────────────────────────
function S_TechnicalRoom({ anno: forcedAnno, showPanel = false }) {
  const [annoState, setAnno] = React.useState(forcedAnno || 'both');
  const anno = forcedAnno || annoState;
  return (
    <Win width={1240} height={780} title="lotem · bioinfo report">
      <WorldRail active="thesis" />
      <Sidebar worldName="Bioinformatics — final report" template="technical" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Report /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>scRNA-seq report</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.6 }}>§3 RESULTS</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink2,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>annotations: {anno}</span>
          <ModeToggle value="write" />
        </div>
        <TechnicalSurface anno={anno} />
        {showPanel && <AnnoPanel anno={anno} setAnno={setAnno} />}
      </div>
    </Win>
  );
}

// ═══════ ANNOTATION SAMPLE (single paragraph, all modes) ─────────────
function AnnoSample({ anno = 'off' }) {
  const showSide = anno === 'side' || anno === 'both';
  return (
    <div style={{ width: showSide ? 880 : 720, height: 380, background: BW.white,
                    border: `1px solid ${BW.rule}`, position: 'relative',
                    display: 'flex' }}>
      <div style={{ flex: 1, padding: '36px 40px', maxWidth: showSide ? 480 : 720 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink4,
                         letterSpacing: 0.8, marginBottom: 14 }}>
          MODE — {anno.toUpperCase()}
        </div>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500,
                        margin: '0 0 18px', letterSpacing: -0.3, color: BW.ink, lineHeight: 1.2 }}>
          On the grammar of refusal.
        </h2>
        <p style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.65, color: BW.ink2,
                       margin: 0, textWrap: 'pretty' }}>
          Melville's scrivener does not refuse so much as withdraw. <HL anno={anno}>His preferred-not-to is a syntax that empties the imperative of its addressee</HL><CmtMark n="1" anno={anno} /> — the office, organized around the production of copies, cannot metabolize <HL anno={anno}>a worker who copies nothing</HL><CmtMark n="2" anno={anno} />, asks for nothing, complains of nothing.
        </p>
      </div>
      {showSide && (
        <div style={{ width: 240, padding: '36px 24px 20px', position: 'relative',
                        borderLeft: `1px solid ${BW.ruleS}` }}>
          <SideCmt n="1" author="Prof. Hale" time="2d" top={80}
            body="Lovely. Cite the org-studies usage?" />
          <SideCmt n="2" author="me" time="4h" top={210}
            body="copies nothing — careful, this is doing a lot of work." />
        </div>
      )}
    </div>
  );
}

// ═══════ HIGHLIGHT COLORS (configurable per world) ═══════════════════
const HL_COLORS = {
  ash:    '#e8e8e8',
  yellow: '#fff3a8',
  pink:   '#ffd6e0',
  blue:   '#cfe3fa',
  green:  '#d6ebcf',
};
const HL_NAMES = Object.keys(HL_COLORS);

function ColorHL({ color, children }) {
  return <span style={{ background: HL_COLORS[color] || HL_COLORS.ash, padding: '0 2px' }}>{children}</span>;
}

// ═══════ FORMAT POPOVER (right-click on highlight) ═══════════════════
function FormatPopover({ top, left, activeColor = 'yellow' }) {
  return (
    <div style={{ position: 'absolute', top, left, background: BW.white,
                    border: `1px solid ${BW.ink}`, display: 'flex',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.12)', zIndex: 20 }}>
      <span style={{ padding: '8px 12px', fontFamily: SERIF, fontSize: 15, fontWeight: 700,
                       borderRight: `1px solid ${BW.ruleS}`, cursor: 'pointer' }}>B</span>
      <span style={{ padding: '8px 12px', fontFamily: SERIF, fontSize: 15, fontStyle: 'italic',
                       borderRight: `1px solid ${BW.ruleS}`, cursor: 'pointer' }}>I</span>
      <span style={{ padding: '8px 12px', fontFamily: SERIF, fontSize: 15, textDecoration: 'underline',
                       borderRight: `1px solid ${BW.ruleS}`, cursor: 'pointer' }}>U</span>
      <span style={{ padding: '8px 10px', fontFamily: MONO, fontSize: 11, color: BW.ink2,
                       borderRight: `1px solid ${BW.ruleS}`, cursor: 'pointer' }}>↗ link</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                       borderRight: `1px solid ${BW.ruleS}` }}>
        {HL_NAMES.map((n) => (
          <span key={n} style={{ width: 16, height: 16, background: HL_COLORS[n],
                  border: `1px solid ${n === activeColor ? BW.ink : BW.rule}`,
                  outline: n === activeColor ? `1px solid ${BW.ink}` : 'none', outlineOffset: 1 }} />
        ))}
        <span style={{ width: 16, height: 16, border: `1px solid ${BW.rule}`,
                fontSize: 10, color: BW.ink3, display: 'flex',
                alignItems: 'center', justifyContent: 'center' }}>⌀</span>
      </div>
      <span style={{ padding: '8px 12px', fontFamily: SANS, fontSize: 11, fontWeight: 500,
                       color: BW.ink, cursor: 'pointer' }}>+ comment</span>
    </div>
  );
}

// ═══════ READ MODE ═══════════════════════════════════════════════════
function S_Read() {
  return (
    <Win width={1100} height={720} title="hollowmere · reading">
      <FocusRail active="hollow" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 14, right: 22, display: 'flex',
                        alignItems: 'center', gap: 14, opacity: 0.6 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>READ</span>
          <span style={{ width: 1, height: 12, background: BW.rule }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>Aa</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>esc ⤢</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{ maxWidth: 580, padding: '110px 32px 100px' }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 32px',
                            letterSpacing: -0.5, color: BW.ink, lineHeight: 1.1 }}>
              The bell-keeper's last morning
            </h1>
            {PROSE.map((p, i) => (
              <p key={i} style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.7, color: BW.ink,
                                    margin: '0 0 1.2em', textWrap: 'pretty' }}>{p}</p>
            ))}
          </div>
        </div>
        <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center',
                         justifyContent: 'center', gap: 22, opacity: 0.45 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>← prev</span>
          <span style={{ fontFamily: SERIF, fontSize: 12, color: BW.ink3 }}>page 2 of 14</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>next →</span>
        </div>
      </div>
    </Win>
  );
}

// ═══════ REVIEW MODE ═════════════════════════════════════════════════
function S_Review() {
  return (
    <Win width={1240} height={780} title="lotem · hollowmere · reviewing">
      <WorldRail active="hollow" />
      <Sidebar worldName="Hollowmere" template="fiction" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '10px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14, background: BW.off }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 0.8,
                            background: BW.ink, color: BW.white, padding: '2px 8px' }}>REVIEWING</span>
          <span style={{ width: 1, height: 14, background: BW.rule }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink2 }}>highlight</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {HL_NAMES.map((n, i) => (
              <span key={n} title={n} style={{ width: 22, height: 22, background: HL_COLORS[n],
                      border: `1px solid ${i === 1 ? BW.ink : BW.rule}`,
                      outline: i === 1 ? `1px solid ${BW.ink}` : 'none', outlineOffset: 2,
                      cursor: 'pointer' }} />
            ))}
          </div>
          <span style={{ width: 1, height: 14, background: BW.rule, marginLeft: 4 }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink2,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>+ comment</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>strike</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>suggest</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.6 }}>4 ✎ · 7 ★</span>
          <span style={{ width: 1, height: 14, background: BW.rule }} />
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink, fontWeight: 500,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>done</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: BW.white, position: 'relative' }}>
          <div style={{ maxWidth: 600, padding: '40px 32px 80px 64px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.8, marginBottom: 18 }}>
              HOLLOWMERE / MANUSCRIPT / CH 1 · REVIEW
            </div>
            <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400,
                            lineHeight: 1.1, margin: '0 0 28px', letterSpacing: -0.5, color: BW.ink }}>
              The bell-keeper's last morning
            </h1>
            <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
              <ColorHL color="yellow">The bell-keeper rang on the wrong morning.</ColorHL><CmtMark n="1" anno="inline" />
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
              There were rules about this. <ColorHL color="blue">Father Ellom kept them in a book the colour of pepper</ColorHL>, and the book was supposed to live on the second shelf above the basin where Mira's mother had once kept the salt, and the salt was supposed to live in a jar that <ColorHL color="pink">nobody touched until the ninth day of the month</ColorHL><CmtMark n="2" anno="inline" />.
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
              Mira walked the long way around the square. <span style={{ textDecoration: 'line-through', textDecorationThickness: '1px', color: BW.ink4 }}>She did not look at the tower,</span> because the tower had not been wrong in eighty-one years.
            </p>
            <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, margin: '0 0 1.1em' }}>
              <ColorHL color="green">The bell rang again. She counted: one, two, three. It should have been seven.</ColorHL>
            </p>
          </div>
          <FormatPopover top={240} left={120} activeColor="blue" />
        </div>
      </div>
    </Win>
  );
}

// ═══════ SETTINGS CHROME ══════════════════════════════════════════════
function SettingsTabs({ tabs, active }) {
  return (
    <div style={{ width: 220, background: BW.off, borderRight: `1px solid ${BW.ruleS}`,
                    padding: '20px 0' }}>
      {tabs.map((t) => (
        <div key={t} style={{ padding: '8px 24px', fontFamily: SANS, fontSize: 13,
                color: t === active ? BW.ink : BW.ink2,
                fontWeight: t === active ? 500 : 400,
                background: t === active ? BW.white : 'transparent',
                borderLeft: `2px solid ${t === active ? BW.ink : 'transparent'}`,
                marginLeft: -1 }}>
          {t}
        </div>
      ))}
    </div>
  );
}

function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr',
                    gap: 24, padding: '18px 0', borderBottom: `1px solid ${BW.ruleS}`,
                    alignItems: 'start' }}>
      <div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: BW.ink, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontFamily: SERIF, fontSize: 12, color: BW.ink3, fontStyle: 'italic', marginTop: 4 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Chip({ children, active }) {
  return (
    <span style={{ padding: '6px 14px',
        border: `1px solid ${active ? BW.ink : BW.rule}`,
        fontFamily: SANS, fontSize: 12, fontWeight: active ? 500 : 400,
        background: active ? BW.ink : BW.white,
        color: active ? BW.white : BW.ink, letterSpacing: 0.2 }}>{children}</span>
  );
}

// ═══════ GLOBAL SETTINGS ═════════════════════════════════════════════
function S_GlobalSettings() {
  return (
    <Win width={1180} height={760} title="lotem · settings">
      <WorldRail />
      <SettingsTabs tabs={['Account', 'Typography', 'Theme', 'Shortcuts', 'Backups', 'About']} active="Typography" />
      <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '32px 40px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 4 }}>SETTINGS</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 8px',
                        letterSpacing: -0.5, color: BW.ink }}>Typography</h1>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3, fontStyle: 'italic',
                       margin: '0 0 24px', maxWidth: 540 }}>
          Defaults across all worlds. Individual worlds may override.
        </p>
        <SettingRow label="Prose font" hint="The body of every piece you write.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Source Serif 4', 'EB Garamond', 'Lora', 'Iowan Old Style'].map((f, i) => (
              <Chip key={f} active={i === 0}>{f}</Chip>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="UI font" hint="Buttons, labels, menus.">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Geist', 'Inter', 'IBM Plex Sans', 'System'].map((f, i) => (
              <Chip key={f} active={i === 0}>{f}</Chip>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Prose size" hint="Default reading size for new worlds.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink3 }}>S</span>
            <div style={{ flex: 1, height: 2, background: BW.rule, position: 'relative', maxWidth: 240 }}>
              <div style={{ width: '60%', height: '100%', background: BW.ink }} />
              <div style={{ position: 'absolute', left: '60%', top: -5, width: 12, height: 12,
                              borderRadius: 12, background: BW.ink, transform: 'translateX(-50%)' }} />
            </div>
            <span style={{ fontFamily: SERIF, fontSize: 18, color: BW.ink }}>L</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3, marginLeft: 6 }}>17 px</span>
          </div>
        </SettingRow>
        <SettingRow label="Line height" hint="">
          <div style={{ display: 'flex', gap: 8 }}>
            {['1.4', '1.55', '1.65', '1.8'].map((v, i) => (
              <Chip key={v} active={i === 2}>{v}</Chip>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Measure" hint="Maximum line width.">
          <div style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink }}>
            64 ch <span style={{ color: BW.ink4 }}> · ~620 px at default size</span>
          </div>
        </SettingRow>
      </div>
    </Win>
  );
}

// ═══════ WORLD SETTINGS ═══════════════════════════════════════════════
function S_WorldSettings() {
  return (
    <Win width={1180} height={760} title="lotem · hollowmere · settings">
      <WorldRail active="hollow" />
      <SettingsTabs
        tabs={['General', 'Template', 'Highlight palette', 'Citation style', 'Export', 'Sharing', 'Backups']}
        active="Highlight palette" />
      <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '32px 40px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 4 }}>HOLLOWMERE</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 8px',
                        letterSpacing: -0.5, color: BW.ink }}>Highlight palette</h1>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3, fontStyle: 'italic',
                       margin: '0 0 24px', maxWidth: 540 }}>
          Five slots. Each one has a name (e.g. "evidence", "to revise") and a tunable colour.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Evidence',   '#fff3a8', 14],
            ['To revise',  '#ffd6e0', 7],
            ['Reference',  '#cfe3fa', 22],
            ['Quote',      '#d6ebcf', 4],
            ['Loose end',  '#e8e8e8', 3],
          ].map(([name, color, uses], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16,
                                       padding: '12px 14px', border: `1px solid ${BW.rule}` }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4 }}>0{i+1}</span>
              <div style={{ width: 32, height: 32, background: color, border: `1px solid ${BW.rule}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SERIF, fontSize: 17, color: BW.ink, fontWeight: 500, letterSpacing: -0.2 }}>{name}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4 }}>
                  {color.toUpperCase()} · {uses} uses
                </div>
              </div>
              <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>rename</span>
              <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>tune</span>
              <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>clear</span>
            </div>
          ))}
          <div style={{ padding: '12px 14px', border: `1px dashed ${BW.rule}`,
                          fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: BW.ink3,
                          textAlign: 'center' }}>
            + add a sixth slot
          </div>
        </div>
      </div>
    </Win>
  );
}

// ═══════ EXPORT DIALOG ════════════════════════════════════════════════
function S_ExportDialog() {
  return (
    <Win width={820} height={620} title="lotem · export">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 44px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 6 }}>HOLLOWMERE / MANUSCRIPT</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 400, margin: '0 0 22px',
                        letterSpacing: -0.5, color: BW.ink }}>Export</h1>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.8, marginBottom: 8 }}>FORMAT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                         border: `1px solid ${BW.rule}`, marginBottom: 22 }}>
          {[
            ['Markdown', '.md',   true],
            ['LaTeX',    '.tex',  false],
            ['HTML',     '.html', false],
            ['PDF',      'print', false],
          ].map(([n, ext, active], i) => (
            <div key={n} style={{ padding: '20px 18px',
                       borderRight: i < 3 ? `1px solid ${BW.rule}` : 'none',
                       background: active ? BW.ink : BW.white,
                       color: active ? BW.white : BW.ink, position: 'relative' }}>
              <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>{n}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7, marginTop: 4, letterSpacing: 0.4 }}>{ext}</div>
              {active && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 13 }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.8, marginBottom: 4 }}>INCLUDE</div>
        <div style={{ borderTop: `1px solid ${BW.rule}` }}>
          {[
            ['Manuscript only',         true,  '1,204 words'],
            ['World notes (characters, places, lore)', false, '42 entries'],
            ['Comments & highlights',   false, '7'],
            ['Front matter (YAML)',     true,  ''],
          ].map(([n, on, m]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 0', borderBottom: `1px solid ${BW.ruleS}` }}>
              <span style={{ width: 14, height: 14, border: `1px solid ${BW.ink}`,
                              background: on ? BW.ink : 'transparent',
                              color: BW.white, fontSize: 9, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{on ? '✓' : ''}</span>
              <span style={{ flex: 1, fontFamily: SERIF, fontSize: 14, color: BW.ink }}>{n}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4 }}>{m}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3 }}>↓ bell-keeper.md</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink3 }}>← import instead</span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink3 }}>cancel</span>
          <button style={{ padding: '10px 22px', border: `1px solid ${BW.ink}`, borderRadius: 0,
                              background: BW.ink, color: BW.white, fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', letterSpacing: 0.4 }}>
            export →
          </button>
        </div>
      </div>
    </Win>
  );
}

// ═══════ BACKUPS ══════════════════════════════════════════════════════
function S_Backups() {
  const rows = [
    ['now',          'Hollowmere · Ch 1',     'auto · pre-edit',   '1,204', true],
    ['12 min ago',   'Hollowmere · Ch 1',     'auto',              '1,190', false],
    ['41 min ago',   'Hollowmere · Ch 1',     'manual · "first draft"', '982', false],
    ['Tue 09:14',    'Hollowmere · world',    'snapshot',          '14.3 MB', false],
    ['Mon',          'All worlds',            'cloud · encrypted',  '63.1 MB', false],
    ['May 6',        'Thesis · silence',     'manual · "before review"', '8,402', false],
  ];
  return (
    <Win width={1180} height={760} title="lotem · backups">
      <WorldRail active="hollow" />
      <SettingsTabs tabs={['General', 'Template', 'Highlight palette', 'Citation style', 'Export', 'Sharing', 'Backups']} active="Backups" />
      <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '32px 40px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 4 }}>HOLLOWMERE</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, margin: '0 0 8px',
                        letterSpacing: -0.5, color: BW.ink }}>Backups & history</h1>
        <p style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3, fontStyle: 'italic',
                       margin: '0 0 24px', maxWidth: 540 }}>
          Local snapshots every 10 minutes. Pin one manually before a big edit. Restore is non-destructive — it makes a new snapshot.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <button style={{ padding: '8px 18px', border: `1px solid ${BW.ink}`,
                              background: BW.ink, color: BW.white, fontSize: 12, fontWeight: 500,
                              borderRadius: 0, letterSpacing: 0.4 }}>+ snapshot now</button>
          <button style={{ padding: '8px 18px', border: `1px solid ${BW.ink}`,
                              background: BW.white, color: BW.ink, fontSize: 12, fontWeight: 500,
                              borderRadius: 0, letterSpacing: 0.4 }}>↓ download .zip</button>
          <button style={{ padding: '8px 18px', border: `1px solid ${BW.rule}`,
                              background: BW.white, color: BW.ink2, fontSize: 12, fontWeight: 400,
                              borderRadius: 0, letterSpacing: 0.4 }}>↑ restore from file</button>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4 }}>
            CLOUD · ON · LAST SYNC 2 MIN
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 220px 120px 80px',
                        gap: 16, padding: '10px 0', borderBottom: `1px solid ${BW.ink}`,
                        fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, color: BW.ink3 }}>
          <span>WHEN</span><span>SCOPE</span><span>KIND</span><span>SIZE</span><span></span>
        </div>
        {rows.map(([when, scope, kind, size, current], i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 220px 120px 80px',
                                  gap: 16, padding: '12px 0', borderBottom: `1px solid ${BW.ruleS}`,
                                  alignItems: 'baseline' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink }}>{when}</span>
            <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink }}>{scope}</span>
            <span style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink2, fontStyle: 'italic' }}>{kind}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3 }}>{size}</span>
            <span style={{ textAlign: 'right' }}>
              {current
                ? <span style={{ fontFamily: MONO, fontSize: 9, color: BW.white, background: BW.ink,
                                  padding: '2px 6px', letterSpacing: 0.6 }}>CURRENT</span>
                : <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink,
                                  borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>restore</span>}
            </span>
          </div>
        ))}
      </div>
    </Win>
  );
}

// ═══════ CITATIONS MANAGER ════════════════════════════════════════════
const CITES = [
  ['agamben1999',  'Agamben, G.',         'Potentialities',                              1999, 'book',        7],
  ['bergen2020',   'Bergen, V. et al.',   'Generalizing RNA velocity to transient cell states', 2020, 'article', 11],
  ['foucault1975', 'Foucault, M.',        'Discipline and Punish',                       1975, 'book',        4],
  ['manno2018',    'La Manno, G. et al.', 'RNA velocity of single cells',                2018, 'article',     6],
  ['melville1853', 'Melville, H.',        'Bartleby, the Scrivener',                     1853, 'short story',12],
  ['scott1998',    'Scott, J. C.',        'Seeing Like a State',                         1998, 'book',        3],
];

function S_Citations() {
  return (
    <Win width={1200} height={760} title="lotem · citations">
      <WorldRail active="thesis" />
      <Sidebar worldName="Silence as governance" template="humanities" activeOverride="1.2" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px',
                         borderBottom: `1px solid ${BW.ruleS}`, gap: 14 }}>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink3 }}>Sources /</span>
          <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontWeight: 500 }}>Citations</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: BW.ink4, letterSpacing: 0.6 }}>83 ENTRIES</span>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          borderBottom: `1px solid ${BW.ink}`, padding: '4px 4px', minWidth: 220 }}>
            <span style={{ color: BW.ink4, fontSize: 13 }}>⌕</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink4 }}>authors, tags, year…</span>
          </div>
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink, fontWeight: 500,
                            borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>↑ upload .bib / .ris</span>
          <span style={{ fontFamily: SANS, fontSize: 11, color: BW.ink3 }}>+ add</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '14px 32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 200px 1fr 60px 100px 70px',
                          gap: 16, padding: '10px 0', borderBottom: `1px solid ${BW.ink}`,
                          fontFamily: MONO, fontSize: 9, letterSpacing: 0.8, color: BW.ink3 }}>
            <span>TAG</span><span>AUTHORS</span><span>TITLE</span><span>YEAR</span><span>TYPE</span><span style={{ textAlign: 'right' }}>USED</span>
          </div>
          {CITES.map(([tag, authors, title, year, type, uses]) => (
            <div key={tag} style={{ display: 'grid', gridTemplateColumns: '120px 200px 1fr 60px 100px 70px',
                                       gap: 16, padding: '14px 0', borderBottom: `1px solid ${BW.ruleS}`,
                                       alignItems: 'baseline' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink }}>{tag}</span>
              <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink, fontStyle: 'italic' }}>{authors}</span>
              <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2 }}>{title}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink3 }}>{year}</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: BW.ink3, letterSpacing: 0.6, textTransform: 'uppercase' }}>{type}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink, textAlign: 'right' }}>{uses}×</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${BW.ruleS}`, padding: '10px 24px',
                         fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.4,
                         display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>STYLE — CHICAGO (AUTHOR-DATE)</span>
          <span style={{ width: 1, height: 12, background: BW.rule }} />
          <span>EXPORT AS .BIB</span>
          <span style={{ flex: 1 }} />
          <span>83 SHOWN · 6 ON THIS PAGE</span>
        </div>
      </div>
    </Win>
  );
}

// ═══════ DESIGN SYSTEM REFERENCE ══════════════════════════════════════
function S_DesignSystem() {
  return (
    <Win width={1200} height={820} title="lotem · design system">
      <div style={{ flex: 1, overflow: 'auto', background: BW.white, padding: '40px 56px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 6 }}>LOTEM · BUILDING BLOCKS</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, margin: '0 0 6px',
                        letterSpacing: -0.7, color: BW.ink, lineHeight: 1 }}>The system.</h1>
        <p style={{ fontFamily: SERIF, fontSize: 16, color: BW.ink3, fontStyle: 'italic',
                       margin: '0 0 32px', maxWidth: 520 }}>
          Six families. Less, but better.
        </p>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>01 — TYPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 22 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink2 }}>Display · 38/1.05</div>
            <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400, letterSpacing: -0.6, lineHeight: 1.05 }}>The bell-keeper</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink2 }}>Heading · 22/1.2</div>
            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, letterSpacing: -0.2 }}>On the grammar of refusal.</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink2 }}>Prose · 17/1.65</div>
            <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.65, color: BW.ink2, maxWidth: 560 }}>
              Melville's scrivener does not refuse so much as withdraw.
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink2 }}>UI · Geist 13</div>
            <div style={{ fontFamily: SANS, fontSize: 13 }}>Manuscript / The bell-keeper</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink2 }}>Meta · Mono 10</div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, color: BW.ink }}>HOLLOWMERE / MANUSCRIPT / CH 1</div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>02 — INK & HIGHLIGHTS</div>
          <div style={{ display: 'flex', border: `1px solid ${BW.rule}`, marginBottom: 12 }}>
            {[
              ['ink',  '#111111', '#fff'],
              ['ink2', '#404040', '#fff'],
              ['ink3', '#737373', '#fff'],
              ['ink4', '#a3a3a3', '#111'],
              ['rule', '#e5e5e5', '#111'],
              ['off',  '#fafafa', '#111'],
              ['white','#ffffff', '#111'],
            ].map(([n, c, fg], i) => (
              <div key={n} style={{ flex: 1, height: 64, background: c, color: fg,
                       padding: '8px 12px', borderRight: i < 6 ? `1px solid ${BW.rule}` : 'none',
                       display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>{n}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 500 }}>{c.toUpperCase()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', border: `1px solid ${BW.rule}` }}>
            {Object.entries(HL_COLORS).map(([n, c], i) => (
              <div key={n} style={{ flex: 1, height: 56, background: c,
                       padding: '8px 12px', borderRight: i < 4 ? `1px solid ${BW.rule}` : 'none' }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink, letterSpacing: 0.4 }}>{n}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink2, marginTop: 2 }}>{c.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>03 — CONTROLS</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={{ padding: '8px 18px', border: `1px solid ${BW.ink}`,
                                background: BW.ink, color: BW.white, fontSize: 12, fontWeight: 500,
                                letterSpacing: 0.4, borderRadius: 0 }}>primary →</button>
            <button style={{ padding: '8px 18px', border: `1px solid ${BW.ink}`,
                                background: BW.white, color: BW.ink, fontSize: 12, fontWeight: 500,
                                letterSpacing: 0.4, borderRadius: 0 }}>secondary</button>
            <span style={{ fontFamily: SANS, fontSize: 12, color: BW.ink,
                              borderBottom: `1px solid ${BW.ink}`, paddingBottom: 1 }}>text link</span>
            <Chip active>chip · on</Chip>
            <Chip>chip · off</Chip>
            <span style={{ width: 14, height: 14, border: `1px solid ${BW.ink}`,
                            background: BW.ink, color: BW.white, fontSize: 9, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>
            <span style={{ width: 28, height: 16, borderRadius: 16, background: BW.ink, position: 'relative' }}>
              <span style={{ position: 'absolute', top: 2, left: 14, width: 12, height: 12,
                              borderRadius: 12, background: BW.white }} />
            </span>
            <span style={{ width: 12, height: 12, borderRadius: 12, border: `1px solid ${BW.ink}`,
                            background: BW.ink, boxShadow: `inset 0 0 0 2px ${BW.white}` }} />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>04 — ANNOTATION ELEMENTS</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: SERIF, fontSize: 15 }}>
              <ColorHL color="yellow">highlight (yellow)</ColorHL>
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 15 }}>
              inline<CmtMark n="1" anno="inline" /> marker
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2 }}>
              footnote<sup style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3 }}>1</sup>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: BW.ink,
                              border: `1px solid ${BW.ink}`, padding: '2px 8px' }}>[Bergen et al. 2020]</span>
            <span style={{ fontFamily: SERIF, fontSize: 14, color: BW.ink2,
                              textDecoration: 'line-through', textDecorationThickness: '1px' }}>strike</span>
            <code style={{ fontFamily: MONO, fontSize: 12, background: BW.off, padding: '2px 6px', border: `1px solid ${BW.rule}` }}>min_counts</code>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16, marginBottom: 28 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>05 — CONTAINERS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div style={{ border: `1px solid ${BW.rule}`, padding: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink4, letterSpacing: 0.8 }}>NOTE · MON</div>
              <div style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink2, fontStyle: 'italic', marginTop: 4 }}>
                bell rings on the wrong morning.
              </div>
            </div>
            <div style={{ border: `1px solid ${BW.ink}`, outline: `1px solid ${BW.ink}`, outlineOffset: 2, padding: 16 }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: BW.ink4, letterSpacing: 0.8 }}>SELECTED</div>
              <div style={{ fontFamily: SERIF, fontSize: 13, color: BW.ink, marginTop: 4 }}>
                a worker who copies nothing.
              </div>
            </div>
            <div style={{ border: `1px dashed ${BW.rule}`, padding: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: SERIF, fontSize: 13, fontStyle: 'italic', color: BW.ink3 }}>
              empty / placeholder
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BW.rule}`, paddingTop: 16 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 1, marginBottom: 14 }}>06 — RHYTHM</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            {[4, 8, 14, 24, 36, 56].map((n) => (
              <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: n, height: n, background: BW.ink }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: BW.ink3 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Win>
  );
}

// ─── BRIEF ────────────────────────────────────────────────────────────
function Brief() {
  return (
    <div style={{ padding: 36, fontFamily: SERIF, color: BW.ink, lineHeight: 1.5,
                    width: '100%', height: '100%', overflow: 'auto', background: BW.white }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: BW.ink, letterSpacing: 1.4, marginBottom: 6 }}>
        LOTEM — BLACK & WHITE
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, letterSpacing: -0.6,
                       lineHeight: 1.05, marginBottom: 18 }}>
        Less, but better.<br/>
        <span style={{ fontStyle: 'italic', color: BW.ink3 }}>A writer's room, undecorated.</span>
      </div>
      <p style={{ fontSize: 14, color: BW.ink2, margin: '0 0 22px' }}>
        Same bones as the warm hi-fi: Worlds, templates, three modes, co-writing, Substack-shaped social.
        Everything that was paper or pigment is now space and hairline.
      </p>
      <div style={{ borderTop: `1px solid ${BW.rule}` }}>
        {[
          ['Type', 'Source Serif 4 for prose. Geist for chrome. Geist Mono for metadata. No third weight when two will do.'],
          ['Palette', 'White, off-white, four greys, ink. No accent. The cursor is the only point of attention.'],
          ['Rule', 'No fills. No shadows. One-pixel hairlines for division. Inversion (black on white → white on black) for the only emphasis.'],
          ['Focus mode', 'A single toggle. The rail thins to four dots; sidebar disappears; the page lifts to centre. Word count and time soften to half-opacity.'],
        ].map(([t, d], i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: `1px solid ${BW.ruleS}`,
                                  display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: BW.ink3, letterSpacing: 0.8 }}>{t.toUpperCase()}</div>
            <div style={{ fontSize: 14, color: BW.ink2 }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "focus": false,
  "invert": false
}/*EDITMODE-END*/;

function CenterFrame({ children, dark = false }) {
  return <div style={{ width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: dark ? '#111' : '#f5f5f5' }}>{children}</div>;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // invert: swap BW palette
  React.useEffect(() => {
    if (t.invert) {
      Object.assign(BW, {
        white: '#0a0a0a', off: '#141414', rule: '#2a2a2a', ruleS: '#1a1a1a',
        ink4: '#525252', ink3: '#737373', ink2: '#a3a3a3', ink: '#f5f5f5', black: '#ffffff',
      });
    } else {
      Object.assign(BW, {
        white: '#ffffff', off: '#fafafa', rule: '#e5e5e5', ruleS: '#f0f0f0',
        ink4: '#a3a3a3', ink3: '#737373', ink2: '#404040', ink: '#111111', black: '#000000',
      });
    }
  }, [t.invert]);

  return (
    <>
      <DesignCanvas>
        <DCSection id="brief" title="Lotem · b&w" subtitle="Less, but better. White, ink, six greys, hairlines.">
          <DCArtboard id="brief" label="brief & system" width={680} height={520}><Brief /></DCArtboard>
        </DCSection>

        <DCSection id="focus" title="Focus mode" subtitle="A single toggle collapses everything but the page.">
          <DCArtboard id="write-normal" label="normal" width={1160} height={760}>
            <CenterFrame dark><S_Write /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="write-focus" label="focus mode" width={1160} height={760}>
            <CenterFrame dark><S_Write focus /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="onboard" title="Onboarding" subtitle="Numbered list, not card grid.">
          <DCArtboard id="tpl" label="template picker" width={1100} height={720}>
            <CenterFrame><S_Templates /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="humanities" title="Humanities — research review" subtitle="A literature seminar paper. Footnotes, blockquote, side comments from advisor.">
          <DCArtboard id="hum-side" label="margin comments" width={1300} height={820}>
            <CenterFrame dark><S_HumanitiesRoom anno="side" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="hum-panel" label="annotation panel open" width={1300} height={820}>
            <CenterFrame dark><S_HumanitiesRoom anno="highlights" showPanel /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="technical" title="Technical — Data Science / Bioinformatics" subtitle="A final report. Figures, equations, code blocks, supervisor notes.">
          <DCArtboard id="tech-both" label="inline + margin (advisor notes)" width={1300} height={820}>
            <CenterFrame dark><S_TechnicalRoom anno="both" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="tech-panel" label="annotation panel open" width={1300} height={820}>
            <CenterFrame dark><S_TechnicalRoom anno="inline" showPanel /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="anno" title="The four annotation modes" subtitle="One paragraph, every mode. Hairline panel is the only chrome.">
          <DCArtboard id="anno-off" label="off — clean" width={760} height={420}>
            <CenterFrame><AnnoSample anno="off" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="anno-hl" label="highlights" width={760} height={420}>
            <CenterFrame><AnnoSample anno="highlights" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="anno-inline" label="inline comments" width={760} height={420}>
            <CenterFrame><AnnoSample anno="inline" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="anno-side" label="margin comments" width={920} height={420}>
            <CenterFrame><AnnoSample anno="side" /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="anno-both" label="both — inline + margin" width={920} height={420}>
            <CenterFrame><AnnoSample anno="both" /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="modes" title="Read & Review modes" subtitle="Read is distraction-free. Review puts the annotation toolbar at the top with a per-world highlight palette.">
          <DCArtboard id="read" label="read mode" width={1100} height={720}>
            <CenterFrame dark><S_Read /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="review" label="review mode — colored highlights + right-click menu" width={1240} height={780}>
            <CenterFrame dark><S_Review /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="settings" title="Settings — global & per-world" subtitle="Typography defaults at the app level. Each world overrides palette, citation style, export, sharing, backups.">
          <DCArtboard id="settings-global" label="global · typography" width={1180} height={760}>
            <CenterFrame dark><S_GlobalSettings /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="settings-world" label="world · highlight palette" width={1180} height={760}>
            <CenterFrame dark><S_WorldSettings /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="settings-backups" label="world · backups & restore" width={1180} height={760}>
            <CenterFrame dark><S_Backups /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="data" title="Data — export, import, citations" subtitle="Plain files in, plain files out. Markdown, LaTeX, HTML, BibTeX/RIS.">
          <DCArtboard id="export" label="export dialog" width={820} height={620}>
            <CenterFrame dark><S_ExportDialog /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="citations" label="citations manager" width={1200} height={760}>
            <CenterFrame dark><S_Citations /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="ds" title="Design system" subtitle="The six families every screen is built from.">
          <DCArtboard id="ds-ref" label="building blocks" width={1200} height={820}>
            <CenterFrame dark><S_DesignSystem /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="room" title="The room — Dump & Split">
          <DCArtboard id="dump" label="brain dump" width={1160} height={760}>
            <CenterFrame dark><S_Dump /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="split" label="split" width={1260} height={760}>
            <CenterFrame dark><S_Split /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="co" title="Co-writing">
          <DCArtboard id="cowrite" label="shared room" width={1260} height={760}>
            <CenterFrame dark><S_CoWriting /></CenterFrame>
          </DCArtboard>
        </DCSection>

        <DCSection id="social" title="The social layer">
          <DCArtboard id="feed" label="feed" width={1260} height={760}>
            <CenterFrame><S_Feed /></CenterFrame>
          </DCArtboard>
          <DCArtboard id="disc" label="discover" width={1260} height={760}>
            <CenterFrame><S_Discover /></CenterFrame>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Focus" />
        <TweakToggle label="Focus mode (collapse chrome)" value={t.focus}
                     onChange={(v) => setTweak('focus', v)} />
        <TweakSection label="Theme" />
        <TweakToggle label="Invert (dark)" value={t.invert}
                     onChange={(v) => setTweak('invert', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
