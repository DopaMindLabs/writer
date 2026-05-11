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
