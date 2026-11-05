import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { TrainFront, ShieldCheck, Armchair, ScanLine } from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { getMeta } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { useState, type ReactNode } from 'react';

const loginSchema = z.object({
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
  phone: z.string().optional(),
});
type RegisterValues = z.infer<typeof registerSchema>;

function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-strong p-10 lg:flex">
        <div className="relative">
          <span className="inline-flex items-center gap-2.5 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-accent"><TrainFront className="h-5 w-5" /></span>
            <span className="text-xl font-semibold">Rail<span className="text-accent">GPT</span></span>
          </span>
          <h2 className="mt-12 max-w-md text-3xl font-semibold leading-tight text-white text-balance">
            Your journeys, reserved and tracked in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              { icon: Armchair, text: 'Real seat, RAC and waiting-list allocation' },
              { icon: ScanLine, text: 'Live PNR status and queue tracking' },
              { icon: ShieldCheck, text: 'Secure, account-linked bookings' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/80">
                <span className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-accent"><Icon className="h-4 w-4" /></span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Railway reservation &amp; travel assistance.</p>
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-10" aria-hidden viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          <path d="M-50 600 C 150 560, 260 460, 420 470 S 620 560, 700 520" fill="none" stroke="#E08A2E" strokeWidth="2" />
          <circle cx="200" cy="520" r="5" fill="#E08A2E" /><circle cx="450" cy="480" r="5" fill="#E08A2E" />
        </svg>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const search = useSearch({ strict: false }) as { redirect?: string };
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta, staleTime: 1000 * 60 * 10, retry: false });
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setServerError('');
    try {
      const user = await login(values.email, values.password);
      toast({ title: `Welcome back, ${user.name.split(' ')[0]}`, tone: 'success' });
      const target = search.redirect || '/trains';
      try {
        const url = new URL(target, window.location.origin);
        navigate({ to: url.pathname, search: Object.fromEntries(url.searchParams) as never });
      } catch {
        navigate({ to: '/trains' });
      }
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Unable to sign in. Please try again.');
    }
  }

  function fillDemo(email: string, password: string) {
    setValue('email', email); setValue('password', password);
  }

  return (
    <AuthLayout
      title="Sign in" subtitle="Access your bookings, trips and profile."
      footer={<>New to RailGPT? <Link to="/register" className="font-medium text-brand hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} required>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Sign in</Button>
      </form>

      {meta?.mode === 'demo' && (
        <div className="mt-6 rounded-md border border-dashed border-line bg-paper/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts</p>
          <div className="mt-2.5 flex flex-col gap-2">
            <button type="button" onClick={() => fillDemo('aarav@railgpt.app', 'Travel@123')}
              className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2 text-sm hover:border-brand/40 transition-colors">
              <span className="font-medium text-ink">Traveller</span><span className="font-mono text-xs text-muted">aarav@railgpt.app</span>
            </button>
            <button type="button" onClick={() => fillDemo('admin@railgpt.app', 'Admin@123')}
              className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2 text-sm hover:border-brand/40 transition-colors">
              <span className="font-medium text-ink">Administrator</span><span className="font-mono text-xs text-muted">admin@railgpt.app</span>
            </button>
          </div>
          <p className="mt-2 text-2xs text-muted">Tap to fill, then sign in. Demo data only.</p>
        </div>
      )}
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuth((s) => s.register);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  async function onSubmit(values: RegisterValues) {
    setServerError('');
    try {
      const user = await registerUser({ name: values.name, email: values.email, password: values.password, phone: values.phone || undefined });
      toast({ title: `Welcome, ${user.name.split(' ')[0]}`, description: 'Your account is ready.', tone: 'success' });
      navigate({ to: '/trains' });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Unable to create your account. Please try again.');
    }
  }

  return (
    <AuthLayout
      title="Create your account" subtitle="Book tickets and keep every journey in one place."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && <Alert tone="error">{serverError}</Alert>}
        <Field label="Full name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" autoComplete="name" placeholder="e.g. Aarav Mehta" {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={errors.email?.message} required>
          <Input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="reg-password" error={errors.password?.message} hint="At least 8 characters." required>
          <Input id="reg-password" type="password" autoComplete="new-password" placeholder="••••••••" {...register('password')} />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+91 …" {...register('phone')} />
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
