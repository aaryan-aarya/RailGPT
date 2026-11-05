import { create } from 'zustand';
import type { User } from '@/lib/api/schemas';
import * as api from '@/lib/api/endpoints';
import { setAccessToken, onUnauthorized } from '@/lib/api/client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  login: async (email, password) => {
    const res = await api.login(email, password);
    setAccessToken(res.token);
    set({ user: res.user, status: 'authenticated' });
    return res.user;
  },

  register: async (input) => {
    const res = await api.register(input);
    setAccessToken(res.token);
    set({ user: res.user, status: 'authenticated' });
    return res.user;
  },

  logout: async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  },

  // Restore the session on load using the httpOnly cookie (no token in storage).
  bootstrap: async () => {
    try {
      const user = await api.getMe();
      set({ user, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  setUser: (user) => set({ user, status: 'authenticated' }),
  clear: () => {
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated' });
  },
}));

// When any API call returns 401 with a token present, drop the session.
onUnauthorized(() => {
  useAuth.getState().clear();
});

export const useIsAdmin = () => useAuth((s) => s.user?.role === 'ADMIN');
