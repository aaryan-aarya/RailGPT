import { useState, type FormEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowRight, KeyRound, ShieldCheck, TrainFront } from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { ApiError } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AdminLoginPage() {
  const login = useAuth((state) => state.login);
  const logout = useAuth((state) => state.logout);
  const navigate = useNavigate();
  const search = useSearch({ from: '/admin/login' }) as { redirect?: string };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role !== 'ADMIN') {
        await logout();
        setError('This account does not have operations access. Contact your system administrator.');
        return;
      }
      const target = search.redirect || '/admin';
      try {
        const url = new URL(target, window.location.origin);
        navigate({ to: url.pathname as never, search: Object.fromEntries(url.searchParams) as never });
      } catch {
        navigate({ to: '/admin' });
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4.5rem)] bg-paper px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid min-h-[min(720px,calc(100vh-10rem))] max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-surface shadow-pop lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative isolate flex min-h-[300px] flex-col justify-between overflow-hidden bg-[#104a3b] p-7 text-white sm:p-10 lg:p-12">
          <div className="soft-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="pointer-events-none absolute -bottom-40 -right-36 h-[32rem] w-[32rem] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="relative">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#efb08c]"><TrainFront className="h-6 w-6" /></span>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-[#efb08c]">RailGPT operations</p>
            <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-4xl">The control room for your railway service.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/70">Manage the catalog, monitor reservation activity and keep every operational change accountable.</p>
          </div>
          <div className="relative mt-10 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-4 backdrop-blur-sm">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7a379] text-[#18352e]"><ShieldCheck className="h-5 w-5" /></span>
            <div><p className="text-sm font-semibold text-white">Protected staff access</p><p className="mt-0.5 text-xs text-white/60">Every sign-in is checked against your admin account.</p></div>
          </div>
        </section>

        <section className="flex items-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><KeyRound className="h-5 w-5" /></div>
            <p className="eyebrow mt-6">Staff portal</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-ink">Administrator sign in</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Use your assigned admin email and password to continue.</p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              {error && <div role="alert" className="rounded-xl border border-wl-line bg-wl-soft px-4 py-3 text-sm text-wl">{error}</div>}
              <label className="block"><span className="field-label">Admin email</span><Input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@organization.com" /></label>
              <label className="block"><span className="field-label">Password</span><Input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
              <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">Enter operations <ArrowRight className="h-4 w-4" /></Button>
            </form>
            <p className="mt-5 text-center text-xs leading-5 text-muted">Access is restricted to accounts with the ADMIN role. Need an account? Contact your system administrator.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
