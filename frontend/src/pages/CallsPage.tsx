import { CircleAlert, RefreshCw, SearchX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getCalls, ApiError } from "../lib/api";
import type { AuthSession, CallRecord } from "../lib/types";
import { formatTimestamp } from "../lib/utils";
import { Button } from "../components/ui/button";

export function CallsPage({ session }: { session: AuthSession }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setCalls(await getCalls(session.token)); } catch (exception) { setError(exception instanceof ApiError ? exception.message : "Unable to load calls."); } finally { setLoading(false); } }, [session.token]);
  useEffect(() => { void load(); }, [load]);

  return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Records</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">Call history</h1><p className="mt-2 text-sm text-muted">Call records returned by the protected `/calls` endpoint.</p></div><Button disabled={loading} onClick={() => void load()} variant="secondary"><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</Button></div>{error && <div className="mt-6 border border-risk-high/40 bg-risk-high/10 p-4 text-sm text-[#f2a3a3]"><CircleAlert className="mr-2 inline" size={16} />{error}</div>}{loading ? <div className="mt-6 space-y-px border border-line bg-line">{[1, 2, 3, 4].map((item) => <div className="h-16 animate-pulse bg-panel" key={item} />)}</div> : calls.length === 0 ? <div className="empty-state mt-6"><SearchX className="text-muted" size={26} /><h2 className="mt-4 text-lg font-medium">No call records yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted">The current API exposes call history only when an upstream call source writes to `/calls`. Audio analyses are recorded as detections and may not appear here until that integration is connected.</p></div> : <div className="mt-6 overflow-x-auto border border-line"><table className="min-w-full text-left text-sm"><thead className="bg-raised text-xs uppercase tracking-[0.12em] text-muted"><tr><th className="px-5 py-3 font-semibold">Call ID</th><th className="px-5 py-3 font-semibold">Started</th><th className="px-5 py-3 font-semibold">Ended</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-line bg-panel">{calls.map((call) => <tr key={call.id}><td className="px-5 py-4 font-mono text-xs text-[#c7d6d8]">{call.callId}</td><td className="px-5 py-4 text-muted">{formatTimestamp(call.startedAt)}</td><td className="px-5 py-4 text-muted">{formatTimestamp(call.endedAt)}</td><td className="px-5 py-4"><span className="border border-line bg-raised px-2 py-1 text-xs">{call.status ?? "—"}</span></td></tr>)}</tbody></table></div>}</div>;
}
