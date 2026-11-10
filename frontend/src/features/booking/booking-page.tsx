import { useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Plus, Trash2, UserRound, ShieldCheck, TrainFront } from 'lucide-react';
import { getTrain, bookTicket } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { PassengerInputSchema } from '@/lib/api/schemas';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { FullPageLoader } from '@/components/ui/spinner';
import { BerthMap } from '@/components/rail/berth-map';
import { toast } from '@/components/ui/toast';
import { formatINR, formatDate, classLabel, genderLabel } from '@/lib/utils';

const formSchema = z.object({ passengers: z.array(PassengerInputSchema).min(1).max(6) });
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
}
export function BookingPage() {
  const { trainNumber } = useParams({ from: '/book/$trainNumber' });
  const search = useSearch({ from: '/book/$trainNumber' }) as { date?: string; class?: string; berth?: string };
  const navigate = useNavigate();
  const date = search.date || '';
  const classType = search.class || 'SL';
  const [step, setStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState('');

  const { data: train, isLoading } = useQuery({
    queryKey: ['train', trainNumber, date],
    queryFn: () => getTrain(trainNumber, date),
  });

  const { control, register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { passengers: [{ name: '', age: '', gender: undefined, berthPreference: search.berth || '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'passengers' });
  const passengers = watch('passengers');

  const cls = train?.classes.find((c) => c.classType === classType);
  const fare = cls?.fare || 0;
  const total = fare * (passengers?.length || 0);

  async function onSubmit(values: FormValues) {
    setServerError('');
    const request = {
      trainNumber, journeyDate: date, classType,
      passengers: values.passengers.map((p) => ({ ...p, berthPreference: p.berthPreference || undefined })),
    };
    const fingerprint = JSON.stringify(request);
    const storageKey = `railgpt:booking-key:${trainNumber}:${date}:${classType}`;
    let saved: { fingerprint: string; key: string } | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      saved = raw ? JSON.parse(raw) as { fingerprint: string; key: string } : null;
    } catch {
      saved = null;
    }
    const idempotencyKey = saved?.fingerprint === fingerprint ? saved.key : newIdempotencyKey();
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, key: idempotencyKey }));
    } catch {
      // The request remains protected while this page stays open.
    }
    try {
      const booking = await bookTicket(request, idempotencyKey);
      try { sessionStorage.removeItem(storageKey); } catch { /* ignore unavailable storage */ }
      toast({ title: 'Booking confirmed', description: `PNR ${booking.pnr}`, tone: 'success' });
      navigate({ to: '/booking/confirmation/$pnr', params: { pnr: booking.pnr } });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Booking failed. Please try again.');
      setStep(1);
    }
  }

  if (isLoading) return <FullPageLoader label="Loading booking details…" />;
  if (!train || !date) {
    return (
      <div className="app-container py-10">
        <Alert tone="error" title="Missing booking details">Please start from a train’s availability page.</Alert>
        <Link to="/trains" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> Search trains
        </Link>
      </div>
    );
  }

  return (
    <div className="app-container max-w-3xl py-6 lg:py-8">
      <Link to="/trains/$trainNumber" params={{ trainNumber }} search={{ date, class: classType }}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to {train.trainName}
      </Link>

      {/* Step indicator */}
      <div className="mt-4 flex items-center gap-3">
        <StepDot n={1} label="Passengers" active={step === 1} done={step > 1} />
        <span className="h-px w-8 bg-line" />
        <StepDot n={2} label="Review & confirm" active={step === 2} done={false} />
      </div>

      {/* Journey summary */}
      <div className="surface-card mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-soft text-brand"><TrainFront className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold text-ink">{train.trainName} <span className="font-mono text-xs text-muted">#{train.trainNumber}</span></p>
            <p className="text-sm text-muted">{train.source} → {train.destination} · {formatDate(date)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{classLabel(classType)} ({classType})</p>
          <p className="text-sm text-muted tnum">{formatINR(fare)} / passenger</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6" noValidate>
        {serverError && <Alert tone="error" title="Booking couldn’t be completed" className="mb-4">{serverError}</Alert>}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-ink">Passenger details</h1>
              <span className="text-sm text-muted">{fields.length}/6 passengers</span>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="surface-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <UserRound className="h-4 w-4 text-brand" /> Passenger {i + 1}
                  </span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="flex items-center gap-1 text-sm text-wl hover:underline">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor={`p-name-${i}`} error={errors.passengers?.[i]?.name?.message} required className="sm:col-span-2">
                    <Input id={`p-name-${i}`} placeholder="As on ID proof" {...register(`passengers.${i}.name`)} />
                  </Field>
                  <Field label="Age" htmlFor={`p-age-${i}`} error={errors.passengers?.[i]?.age?.message} required>
                    <Input id={`p-age-${i}`} type="number" min={1} max={120} placeholder="e.g. 29" {...register(`passengers.${i}.age`)} />
                  </Field>
                  <Field label="Gender" htmlFor={`p-gender-${i}`} error={errors.passengers?.[i]?.gender?.message} required>
                    <Select id={`p-gender-${i}`} defaultValue="" {...register(`passengers.${i}.gender`)}>
                      <option value="" disabled>Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <p className="field-label">Berth preference <span className="font-normal text-muted">(optional)</span></p>
                    <input type="hidden" {...register(`passengers.${i}.berthPreference`)} />
                    <BerthMap
                      classType={classType}
                      seatNumber={null}
                      selectedBerth={passengers?.[i]?.berthPreference || null}
                      onSelectBerth={(berth) => setValue(`passengers.${i}.berthPreference`, berth || '', { shouldDirty: true, shouldTouch: true })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {fields.length < 6 && (
              <Button type="button" variant="outline" onClick={() => append({ name: '', age: '', gender: undefined, berthPreference: '' } as unknown as FormInput['passengers'][number])}>
                <Plus className="h-4 w-4" /> Add another passenger
              </Button>
            )}
            <div className="flex justify-end">
              <Button type="button" size="lg" onClick={handleSubmit(() => setStep(2))}>
                Continue to review <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-lg font-semibold text-ink">Review &amp; confirm</h1>
            <div className="surface-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-2.5 font-medium">Passenger</th>
                    <th className="px-4 py-2.5 font-medium">Age / Gender</th>
                    <th className="px-4 py-2.5 font-medium">Preference</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-3 font-medium text-ink">{p.name || '—'}</td>
                      <td className="px-4 py-3 text-body">{p.age ? String(p.age) : '—'} · {p.gender ? genderLabel(p.gender) : '—'}</td>
                      <td className="px-4 py-3 text-muted">{p.berthPreference || 'No preference'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{classLabel(classType)} × {passengers.length}</span>
                <span className="text-ink tnum">{formatINR(fare)} × {passengers.length}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="font-semibold text-ink">Total fare</span>
                <span className="text-xl font-semibold text-ink tnum">{formatINR(total)}</span>
              </div>
              <p className="mt-2 text-2xs text-muted">Indicative demo fare. No payment is processed in this environment.</p>
            </div>

            <Alert tone="info">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Seats are allocated instantly. If the class is full, you’ll be placed in RAC or the waiting list and can track your PNR.</span>
            </Alert>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Edit passengers
              </Button>
              <Button type="submit" size="lg" loading={isSubmitting}>
                Confirm &amp; book
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-brand text-white' : done ? 'bg-ok text-white' : 'bg-paper text-muted border border-line'}`}>
        {n}
      </span>
      <span className={`text-sm ${active ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
    </span>
  );
}
