import { Activity, AlertTriangle, History, LogOut, ScanLine, ShieldCheck } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import type { User } from "../lib/types";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

const navigation = [
  { to: "/analyze", label: "Analyze audio", icon: ScanLine },
  { to: "/calls", label: "Call history", icon: History },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle }
];

export function AppShell({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const navigate = useNavigate();
  const signOut = () => {
    onSignOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="border-b border-line bg-[#0c0f12] lg:fixed lg:inset-y-0 lg:w-[15.5rem] lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <span className="flex h-8 w-8 items-center justify-center border border-signal/50 bg-signal/10 text-signal"><Activity size={17} strokeWidth={2.2} /></span>
          <div>
            <p className="text-sm font-semibold tracking-tight">Signal Ledger</p>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.15em] text-muted">Voice integrity</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) => cn(
                "flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                isActive ? "bg-raised text-ink" : "text-muted hover:bg-raised hover:text-ink"
              )}
              key={to}
              to={to}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#243038] text-xs font-bold text-[#bdd2d5]">{user.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>
          <Button className="w-full justify-start" onClick={signOut} variant="ghost"><LogOut size={15} /> Sign out</Button>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-line px-5 sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted"><ShieldCheck size={15} className="text-signal" /> Protected workspace</div>
          <Button className="lg:hidden" onClick={signOut} variant="ghost"><LogOut size={15} /> Sign out</Button>
        </header>
        <div className="mx-auto max-w-7xl p-5 sm:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
