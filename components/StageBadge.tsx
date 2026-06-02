const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  GROUP_STAGE:    { label: 'Fase de Grupos',  color: 'text-sky-400 bg-sky-900/30 border-sky-700/30' },
  ROUND_OF_16:    { label: 'Octavos de Final', color: 'text-violet-400 bg-violet-900/30 border-violet-700/30' },
  QUARTER_FINALS: { label: 'Cuartos de Final', color: 'text-orange-400 bg-orange-900/30 border-orange-700/30' },
  SEMI_FINALS:    { label: 'Semifinal',        color: 'text-pink-400 bg-pink-900/30 border-pink-700/30' },
  THIRD_PLACE:    { label: 'Tercer Puesto',    color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
  FINAL:          { label: 'Final',            color: 'text-green-400 bg-green-900/30 border-green-700/30' },
};

export function formatGroup(group: string): string {
  return group.replace(/^Group_?/i, 'GRUPO ').toUpperCase();
}

export function formatSectionLabel(key: string): string {
  if (STAGE_LABELS[key]) return STAGE_LABELS[key].label;
  return formatGroup(key);
}

export default function StageBadge({ stage, group }: { stage: string; group: string | null }) {
  const { label, color } = STAGE_LABELS[stage] ?? { label: stage, color: 'text-slate-400 bg-slate-700/30 border-slate-600/30' };
  const groupLabel = group ? formatGroup(group) : null;
  const text = groupLabel ? `${label} · ${groupLabel}` : label;
  return (
    <span className={`text-[10px] font-medium border rounded-full px-2 py-0.5 leading-none ${color}`}>
      {text}
    </span>
  );
}
