import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRound, KeyRound, ShieldCheck, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { updateProfile, changePassword } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { initials } from '@/lib/utils';
import { useState } from 'react';

const profileSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  phone: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: z.string().min(8, 'Use at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, { message: 'Passwords don’t match', path: ['confirmPassword'] });
type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profileError, setProfileError] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });
  const pwForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  if (!user) return null;

  async function onSaveProfile(values: ProfileValues) {
    setProfileError('');
    try {
      const updated = await updateProfile({ name: values.name, phone: values.phone || undefined });
      setUser(updated);
      toast({ title: 'Profile updated', tone: 'success' });
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : 'Couldn’t update your profile.');
    }
  }

  async function onChangePassword(values: PasswordValues) {
    setPwError(''); setPwSuccess(false);
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setPwSuccess(true);
      pwForm.reset();
      toast({ title: 'Password changed', tone: 'success' });
    } catch (e) {
      setPwError(e instanceof ApiError ? e.message : 'Couldn’t change your password.');
    }
  }

  return (
    <div className="app-container max-w-3xl py-6 lg:py-8">
      <h1 className="text-2xl font-semibold text-ink">My profile</h1>
      <p className="mt-1 text-sm text-muted">Manage your account details and security.</p>

      {/* Identity card */}
      <div className="surface-card mt-6 flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-xl font-semibold text-white">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-ink">{user.name}</p>
            {user.role === 'ADMIN' && <Badge tone="accent"><ShieldCheck className="h-3 w-3" /> Admin</Badge>}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted"><Mail className="h-3.5 w-3.5" />{user.email}</p>
          {user.phone && <p className="flex items-center gap-1.5 text-sm text-muted"><Phone className="h-3.5 w-3.5" />{user.phone}</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Edit profile */}
        <div className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-md font-semibold text-ink"><UserRound className="h-4 w-4 text-brand" /> Personal details</h2>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="mt-4 space-y-4" noValidate>
            {profileError && <Alert tone="error">{profileError}</Alert>}
            <Field label="Full name" htmlFor="profile-name" error={profileForm.formState.errors.name?.message} required>
              <Input id="profile-name" {...profileForm.register('name')} />
            </Field>
            <Field label="Phone" htmlFor="profile-phone" error={profileForm.formState.errors.phone?.message}>
              <Input id="profile-phone" type="tel" placeholder="+91 …" {...profileForm.register('phone')} />
            </Field>
            <Field label="Email" htmlFor="profile-email" hint="Email is your sign-in identifier and can’t be changed here.">
              <Input id="profile-email" value={user.email} disabled />
            </Field>
            <Button type="submit" loading={profileForm.formState.isSubmitting}>Save changes</Button>
          </form>
        </div>

        {/* Change password */}
        <div className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-md font-semibold text-ink"><KeyRound className="h-4 w-4 text-brand" /> Change password</h2>
          <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="mt-4 space-y-4" noValidate>
            {pwError && <Alert tone="error">{pwError}</Alert>}
            {pwSuccess && <Alert tone="success">Your password has been updated.</Alert>}
            <Field label="Current password" htmlFor="cur-pw" error={pwForm.formState.errors.currentPassword?.message} required>
              <Input id="cur-pw" type="password" autoComplete="current-password" {...pwForm.register('currentPassword')} />
            </Field>
            <Field label="New password" htmlFor="new-pw" error={pwForm.formState.errors.newPassword?.message} hint="At least 8 characters." required>
              <Input id="new-pw" type="password" autoComplete="new-password" {...pwForm.register('newPassword')} />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm-pw" error={pwForm.formState.errors.confirmPassword?.message} required>
              <Input id="confirm-pw" type="password" autoComplete="new-password" {...pwForm.register('confirmPassword')} />
            </Field>
            <Button type="submit" loading={pwForm.formState.isSubmitting}>Update password</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
