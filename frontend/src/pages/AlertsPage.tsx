import { BellRing, CircleAlert, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, getAlerts } from "../lib/api";
import type { AlertRecord, AuthSession } from "../lib/types";
import { formatTimestamp } from "../lib/utils";
import { RiskBadge } from "../components/RiskBadge";
import { Button } from "../components/ui/button";

export function AlertsPage({ session }: { session: AuthSession }) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setAlerts(await getAlerts(session.token)); } catch (exception) { setError(exception instanceof ApiError ? exception.message : "Unable to load alerts."); } finally { setLoading(false); } }, [session.token]);
  useEffect(() => { void load(); }, [load]);
  const ordered = [...alerts].sort((a, b) => (a.riskLevel === "HIGH" ? -1 : b.riskLevel === "HIGH" ? 1 : 0));

  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Escalations</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Alerts</h1><p className="mt-2 text-sm text-muted">High-risk alerts are shown first and remain visually distinct.</p></div><Button disabled={loading} onClick={() => void load()} variant="secondary"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</Button></div>{error && <div className="mt-6 border border-risk-high/40 bg-risk-high/10 p-4 text-sm text-[#f2a3a3]"><CircleAlert className="mr-2 inline" size={16} />{error}</div>}{loading ? <div className="mt-6 grid gap-3">{[1, 2, 3].map((item) => <div className="h-28 animate-pulse border border-line bg-panel" key={item} />)}</div> : ordered.length === 0 ? <div className="empty-state mt-6"><BellRing className="text-muted" size={26} /><h2 className="mt-4 text-lg font-medium">No open alerts</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">Alerts are created by the detection service when a submitted audio window reaches the high-risk threshold.</p></div> : <div className="mt-6 grid gap-3">{ordered.map((alert) => <article className={`border bg-panel p-5 ${alert.riskLevel === "HIGH" ? "border-risk-high/60 bg-[#1a1113]" : "border-line"}`} key={alert.id}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><RiskBadge level={alert.riskLevel} /><span className="font-mono text-xs text-muted">{alert.callId}</span></div><h2 className="mt-4 text-lg font-medium">{alert.message ?? "Detection alert"}</h2><p className="mt-1 text-sm text-muted">Recommended action: <span className="text-[#d7e0e1]">{alert.action ?? "Review the associated call."}</span></p></div><div className="text-sm text-muted"><p>{formatTimestamp(alert.createdAt)}</p><p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em]">{alert.status ?? "OPEN"}</p></div></div></article>)}</div>}</div>;
}
