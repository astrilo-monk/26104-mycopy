import type { AuthSession } from "./types";

const KEY = "signal-ledger.session";

export function readSession(): AuthSession | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    return stored ? (JSON.parse(stored) as AuthSession) : null;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}

export function writeSession(session: AuthSession) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
