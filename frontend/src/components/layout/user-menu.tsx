import { Link, useNavigate } from '@tanstack/react-router';
import { User as UserIcon, Ticket, ShieldCheck, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth/store';
import { initials } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';

export function UserMenu() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') {
    return <div className="h-9 w-24 skeleton" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="hidden sm:inline-flex h-9 items-center rounded px-3 text-sm font-medium text-body hover:text-brand transition-colors">
          Sign in
        </Link>
        <Link to="/register" className="inline-flex h-9 items-center rounded bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-strong transition-colors">
          Create account
        </Link>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    toast({ title: 'Signed out', tone: 'info' });
    navigate({ to: '/' });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 hover:border-brand/40 transition-colors" aria-label="Account menu">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="hidden max-w-[110px] truncate text-sm font-medium text-ink sm:block">{user.name.split(' ')[0]}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block normal-case tracking-normal text-sm font-semibold text-ink">{user.name}</span>
          <span className="block truncate normal-case tracking-normal text-xs font-normal text-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: '/profile' })}>
          <UserIcon className="h-4 w-4" /> My profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: '/trips' })}>
          <Ticket className="h-4 w-4" /> My trips
        </DropdownMenuItem>
        {user.role === 'ADMIN' && (
          <DropdownMenuItem onSelect={() => navigate({ to: '/admin' })}>
            <ShieldCheck className="h-4 w-4" /> Admin console
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-wl data-[highlighted]:bg-wl-soft data-[highlighted]:text-wl">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
