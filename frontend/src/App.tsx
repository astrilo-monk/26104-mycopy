import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { AppShell } from "./components/AppShell";
import { clearSession, readSession, writeSession } from "./lib/session";
import type { AuthSession } from "./lib/types";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyzePage } from "./pages/AnalyzePage";
import { AuthPage } from "./pages/AuthPage";
import { CallsPage } from "./pages/CallsPage";

function ProtectedRoutes({ session, onSignOut }: { session: AuthSession; onSignOut: () => void }) {
  return (
    <Routes>
      <Route element={<AppShell onSignOut={onSignOut} user={session.user} />}>
        <Route element={<AnalyzePage session={session} />} path="/analyze" />
        <Route element={<CallsPage session={session} />} path="/calls" />
        <Route element={<AlertsPage session={session} />} path="/alerts" />
      </Route>
      <Route element={<Navigate replace to="/analyze" />} path="*" />
    </Routes>
  );
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const authenticate = (nextSession: AuthSession) => {
    writeSession(nextSession);
    setSession(nextSession);
  };
  const signOut = () => {
    clearSession();
    setSession(null);
  };

  if (session) return <ProtectedRoutes onSignOut={signOut} session={session} />;

  return (
    <Routes>
      <Route element={<AuthPage onAuthenticated={authenticate} />} path="/login" />
      <Route element={<Navigate replace to="/login" />} path="*" />
    </Routes>
  );
}
