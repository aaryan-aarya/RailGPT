import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, TrainFront } from 'lucide-react';
import { getAdminTrains, addTrain, updateTrain, deleteTrain } from '@/lib/api/endpoints';
import type { Train } from '@/lib/api/schemas';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FullPageLoader } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { classLabel } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CLASS_TYPES = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S'];

const classSchema = z.object({
  classType: z.string().min(1),
  totalSeats: z.coerce.number().int().min(1),
  fare: z.coerce.number().min(0),
  racLimit: z.coerce.number().int().min(0),
  waitingLimit: z.coerce.number().int().min(0),
});
const trainSchema = z.object({
  trainNumber: z.string().min(4, 'Enter a train number'),
  trainName: z.string().min(2, 'Enter a train name'),
  source: z.string().min(2, 'Enter the origin'),
  destination: z.string().min(2, 'Enter the destination'),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  durationMinutes: z.coerce.number().optional(),
  distanceKm: z.coerce.number().optional(),
  trainType: z.string().optional(),
  daysOfRun: z.array(z.string()).min(1, 'Select at least one day'),
  classes: z.array(classSchema).min(1, 'Add at least one class'),
});
type TrainInput = z.input<typeof trainSchema>;
type TrainValues = z.output<typeof trainSchema>;

const emptyTrain: TrainValues = {
  trainNumber: '', trainName: '', source: '', destination: '',
  departureTime: '', arrivalTime: '', durationMinutes: undefined, distanceKm: undefined,
  trainType: 'Mail/Express', daysOfRun: [...DAYS],
  classes: [{ classType: 'SL', totalSeats: 72, fare: 500, racLimit: 18, waitingLimit: 40 }],
};

export function AdminTrainsPage() {
  const queryClient = useQueryClient();
  const { data: trains, isLoading, isError, error } = useQuery({ queryKey: ['admin', 'trains'], queryFn: getAdminTrains });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Train | null>(null);
  const [deleting, setDeleting] = useState<Train | null>(null);
  const [busy, setBusy] = useState(false);

  function openAdd() { setEditing(null); setDialogOpen(true); }
  function openEdit(t: Train) { setEditing(t); setDialogOpen(true); }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteTrain(deleting.trainNumber);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Train removed', tone: 'success' });
      setDeleting(null);
    } catch (e) {
      toast({ title: 'Couldn’t remove train', description: e instanceof ApiError ? e.message : 'Try again.', tone: 'error' });
    } finally { setBusy(false); }
  }

  const columns: ColumnDef<Train, unknown>[] = [
    { accessorKey: 'trainNumber', header: 'Number', cell: ({ row }) => <span className="font-mono font-medium text-brand">{row.original.trainNumber}</span> },
    { accessorKey: 'trainName', header: 'Name', cell: ({ row }) => <span className="font-medium text-ink">{row.original.trainName}</span> },
    { accessorKey: 'source', header: 'Route', cell: ({ row }) => <span className="text-sm">{row.original.source} → {row.original.destination}</span> },
    { accessorKey: 'trainType', header: 'Type', cell: ({ row }) => row.original.trainType ? <Badge>{row.original.trainType}</Badge> : '—' },
    { accessorKey: 'classes', header: 'Classes', enableSorting: false, cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">{row.original.classes.map((c) => <span key={c.classType} className="rounded-sm bg-paper px-1.5 py-0.5 font-mono text-2xs text-body">{c.classType}</span>)}</div>
    ) },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <button onClick={() => openEdit(row.original)} className="rounded p-1.5 text-muted hover:bg-brand-soft hover:text-brand transition-colors" aria-label={`Edit ${row.original.trainName}`}><Pencil className="h-4 w-4" /></button>
        <button onClick={() => setDeleting(row.original)} className="rounded p-1.5 text-muted hover:bg-wl-soft hover:text-wl transition-colors" aria-label={`Delete ${row.original.trainName}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{trains?.length || 0} trains in the catalog</p>
        <Button onClick={openAdd}><Plus className="h-4 w-4" /> Add train</Button>
      </div>
      {isLoading && <FullPageLoader label="Loading trains…" />}
      {isError && <Alert tone="error" title="Couldn’t load trains">{(error as Error)?.message}</Alert>}
      {trains && <DataTable data={trains} columns={columns} searchPlaceholder="Search trains…" emptyMessage="No trains match your search." />}

      {dialogOpen && (
        <TrainFormDialog
          key={editing?.trainNumber || 'new'}
          train={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ['admin'] }); setDialogOpen(false); }}
        />
      )}

      <Dialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent title="Remove this train?" description={deleting ? `${deleting.trainName} (${deleting.trainNumber})` : ''}>
          <p className="text-sm text-body">This removes the train from the catalog. Existing bookings are not deleted. This can’t be undone.</p>
          <div className="mt-5 flex justify-end gap-3">
            <DialogClose asChild><Button variant="outline">Keep train</Button></DialogClose>
            <Button variant="danger" loading={busy} onClick={handleDelete}><Trash2 className="h-4 w-4" /> Remove</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrainFormDialog({ train, onClose, onSaved }: { train: Train | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [serverError, setServerError] = useState('');
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<TrainInput, unknown, TrainValues>({
    resolver: zodResolver(trainSchema),
    defaultValues: train ? {
      trainNumber: train.trainNumber, trainName: train.trainName, source: train.source, destination: train.destination,
      departureTime: train.departureTime || '', arrivalTime: train.arrivalTime || '',
      durationMinutes: train.durationMinutes, distanceKm: train.distanceKm, trainType: train.trainType || '',
      daysOfRun: train.daysOfRun || [...DAYS],
      classes: train.classes.map((c) => ({ ...c })),
    } : emptyTrain,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'classes' });
  const daysOfRun = watch('daysOfRun');

  function toggleDay(day: string) {
    const next = daysOfRun.includes(day) ? daysOfRun.filter((d) => d !== day) : [...daysOfRun, day];
    setValue('daysOfRun', next, { shouldValidate: true });
  }

  async function onSubmit(values: TrainValues) {
    setServerError('');
    try {
      if (train) await updateTrain(train.trainNumber, values);
      else await addTrain(values);
      toast({ title: train ? 'Train updated' : 'Train added', tone: 'success' });
      await onSaved();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Couldn’t save the train.');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={train ? 'Edit train' : 'Add a train'} description={train ? `#${train.trainNumber}` : 'Create a new service in the catalog.'} className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && <Alert tone="error">{serverError}</Alert>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Train number" htmlFor="t-number" error={errors.trainNumber?.message} required>
              <Input id="t-number" placeholder="e.g. 12951" {...register('trainNumber')} disabled={Boolean(train)} />
            </Field>
            <Field label="Train name" htmlFor="t-name" error={errors.trainName?.message} required>
              <Input id="t-name" placeholder="e.g. Mumbai Rajdhani" {...register('trainName')} />
            </Field>
            <Field label="Source" htmlFor="t-source" error={errors.source?.message} required>
              <Input id="t-source" placeholder="Origin station" {...register('source')} />
            </Field>
            <Field label="Destination" htmlFor="t-dest" error={errors.destination?.message} required>
              <Input id="t-dest" placeholder="Destination station" {...register('destination')} />
            </Field>
            <Field label="Departure" htmlFor="t-dep"><Input id="t-dep" type="time" {...register('departureTime')} /></Field>
            <Field label="Arrival" htmlFor="t-arr"><Input id="t-arr" type="time" {...register('arrivalTime')} /></Field>
            <Field label="Duration (minutes)" htmlFor="t-dur"><Input id="t-dur" type="number" {...register('durationMinutes')} /></Field>
            <Field label="Distance (km)" htmlFor="t-dist"><Input id="t-dist" type="number" {...register('distanceKm')} /></Field>
            <Field label="Type" htmlFor="t-type" className="sm:col-span-2">
              <Select id="t-type" {...register('trainType')}>
                {['Mail/Express', 'Superfast', 'Rajdhani', 'Shatabdi', 'Duronto', 'Garib Rath', 'Intercity', 'Jan Shatabdi'].map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Runs on" error={errors.daysOfRun?.message}>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={daysOfRun.includes(d)}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${daysOfRun.includes(d) ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:border-brand/40'}`}>
                  {d}
                </button>
              ))}
            </div>
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="field-label mb-0">Classes &amp; capacity</span>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ classType: '3A', totalSeats: 64, fare: 1500, racLimit: 16, waitingLimit: 36 })}>
                <Plus className="h-3.5 w-3.5" /> Add class
              </Button>
            </div>
            {errors.classes && !Array.isArray(errors.classes) && <p className="field-error">{errors.classes.message}</p>}
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-2 rounded border border-line p-2.5">
                  <Field label="Class" htmlFor={`c-type-${i}`} className="mb-0">
                    <Select id={`c-type-${i}`} {...register(`classes.${i}.classType`)}>
                      {CLASS_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </Field>
                  <Field label="Seats" htmlFor={`c-seats-${i}`}><Input id={`c-seats-${i}`} type="number" {...register(`classes.${i}.totalSeats`)} /></Field>
                  <Field label="Fare ₹" htmlFor={`c-fare-${i}`}><Input id={`c-fare-${i}`} type="number" {...register(`classes.${i}.fare`)} /></Field>
                  <Field label="RAC" htmlFor={`c-rac-${i}`}><Input id={`c-rac-${i}`} type="number" {...register(`classes.${i}.racLimit`)} /></Field>
                  <Field label="WL" htmlFor={`c-wl-${i}`}><Input id={`c-wl-${i}`} type="number" {...register(`classes.${i}.waitingLimit`)} /></Field>
                  <button type="button" onClick={() => remove(i)} disabled={fields.length === 1}
                    className="mb-1 rounded p-2 text-muted hover:bg-wl-soft hover:text-wl disabled:opacity-40 transition-colors" aria-label="Remove class">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" loading={isSubmitting}><TrainFront className="h-4 w-4" /> {train ? 'Save changes' : 'Add train'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
