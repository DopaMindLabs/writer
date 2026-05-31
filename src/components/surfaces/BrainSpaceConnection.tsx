import { db } from '@/db/db';
import type { Connection, Note } from '@/db/schema';

interface BrainSpaceConnectionProps {
  connection: Connection;
  from: Note;
  to: Note;
}

export const BrainSpaceConnection = ({
  connection,
  from,
  to,
}: BrainSpaceConnectionProps) => {
  const cx1 = from.l + from.w / 2;
  const cy1 = from.t + from.h / 2;
  const cx2 = to.l + to.w / 2;
  const cy2 = to.t + to.h / 2;
  const mx = (cx1 + cx2) / 2;
  const my = (cy1 + cy2) / 2 - 30;
  const d = `M ${String(cx1)} ${String(cy1)} Q ${String(mx)} ${String(my)}, ${String(cx2)} ${String(cy2)}`;

  const onDelete = () => {
    void db.connections.delete(connection.id);
  };

  return (
    <g className="group cursor-pointer" onClick={onDelete}>
      <path
        d={d}
        stroke="transparent"
        strokeWidth={14}
        fill="none"
        pointerEvents="stroke"
      />
      <path
        d={d}
        stroke="var(--rule)"
        strokeWidth={1}
        fill="none"
        strokeDasharray="2 3"
        pointerEvents="none"
        className="transition-[stroke,stroke-width] group-hover:stroke-[var(--ink)] group-hover:stroke-2"
      />
      <g
        className="opacity-0 transition-opacity group-hover:opacity-100"
        pointerEvents="none"
      >
        <circle cx={mx} cy={my} r={8} fill="var(--paper)" stroke="var(--ink)" />
        <text
          x={mx}
          y={my + 3}
          fontSize={10}
          textAnchor="middle"
          fill="var(--ink)"
          fontFamily="monospace"
        >
          ×
        </text>
      </g>
    </g>
  );
};
