import { CoverageRisk } from "@/lib/api";
import { AlertTriangle, CheckCircle, Flame } from "lucide-react";

export function CoverageRiskBadge({ risk }: { risk?: CoverageRisk | null }) {
  if (!risk) return null;

  if (risk.level === "RED") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 shadow-xs dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        <Flame className="h-3.5 w-3.5 animate-pulse text-red-600" />
        <span>RED · Severe Coverage Risk</span>
        {risk.staffing_ratio !== undefined && (
          <span className="ml-1 rounded-full bg-red-200/80 px-1.5 py-0.2 text-[10px] dark:bg-red-900/80">
            {Math.round(risk.staffing_ratio * 100)}% cap
          </span>
        )}
      </div>
    );
  }

  if (risk.level === "AMBER") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        <span>AMBER · Moderate Overlap</span>
        {risk.staffing_ratio !== undefined && (
          <span className="ml-1 rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[10px] dark:bg-amber-900/80">
            {Math.round(risk.staffing_ratio * 100)}% cap
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
      <span>GREEN · Safe Coverage</span>
    </div>
  );
}
