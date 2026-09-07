import { Activity, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, getMe, signIn, signUp } from "../lib/api";
import type { AuthSession } from "../lib/types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

type AuthMode = "login" | "signup";

export function AuthPage({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") await signUp(name.trim(), email.trim(), password);
      const token = await signIn(email.trim(), password);
      const user = await getMe(token.access_token);
      onAuthenticated({ token: token.access_token, user });
      navigate("/analyze", { replace: true });
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : "Unable to authenticate. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_30rem]">
      <section className="hidden border-r border-line p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-signal/50 bg-signal/10 text-signal"><Activity size={18} /></span><span className="font-semibold">Signal Ledger</span></div>
        <div className="max-w-xl">
          <p className="eyebrow mb-5">Voice integrity operations</p>
          <h1 className="max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-ink">Assess synthetic voice risk with an auditable signal trail.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">Every uploaded sample is evaluated in overlapping AASIST windows, retained as individual evidence points, and escalated using defined risk thresholds.</p>
        </div>
        <div className="flex gap-8 text-xs text-muted"><span className="flex items-center gap-2"><ShieldCheck size={15} className="text-signal" /> Authenticated access</span><span className="flex items-center gap-2"><LockKeyhole size={15} className="text-signal" /> Signed requests</span></div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center border border-signal/50 bg-signal/10 text-signal"><Activity size={18} /></span><span className="font-semibold">Signal Ledger</span></div></div>
          <p className="eyebrow">Secure access</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{mode === "login" ? "Welcome back" : "Create your workspace"}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{mode === "login" ? "Sign in to review analysis and alert records." : "Your account is stored in the protected operations database."}</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && <label className="block"><span className="mb-2 block text-sm font-medium">Name</span><Input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Your name" required value={name} /></label>}
            <label className="block"><span className="mb-2 block text-sm font-medium">Email</span><Input autoComplete="email" onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required type="email" value={email} /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium">Password</span><Input autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required type="password" value={password} /></label>
            {error && <p aria-live="polite" className="border border-risk-high/40 bg-risk-high/10 p-3 text-sm text-[#f3aaaa]">{error}</p>}
            <Button className="w-full" disabled={submitting} type="submit">{submitting ? "Verifying access…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16} /></Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">{mode === "login" ? "Need an account?" : "Already have an account?"} <button className="font-medium text-signal hover:text-[#a7dfd6]" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} type="button">{mode === "login" ? "Create one" : "Sign in"}</button></p>
        </div>
      </section>
    </main>
  );
}
