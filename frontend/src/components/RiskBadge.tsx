import type { RiskLevel } from "../lib/types";
import { cn } from "../lib/utils";

const tone: Record<RiskLevel, string> = {
  LOW: "border-risk-low/35 bg-risk-low/10 text-[#9addd2]",
  MEDIUM: "border-risk-medium/35 bg-risk-medium/10 text-[#edc979]",
  HIGH: "border-risk-high/40 bg-risk-high/10 text-[#f09a9a]"
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.6875rem] font-bold tracking-[0.12em]", tone[level])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
