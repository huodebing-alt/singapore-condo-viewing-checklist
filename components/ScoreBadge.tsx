import { scoreColor } from "@/lib/checklist";

export default function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span
      className="score-badge"
      style={{ background: score === null ? "#c2cfc6" : scoreColor(score) }}
      title="Overall score"
    >
      {score === null ? "—" : score}
    </span>
  );
}
