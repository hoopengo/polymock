import { create } from "zustand";

// ============================================================
// Types
// ============================================================

export interface User {
  id: number;
  username: string;
  balance: number;
  is_admin: boolean;
  avatar_url: string | null;
  theme: "dark" | "light";
  email_notifications: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

// ============================================================
// LocalStorage Keys
// ============================================================

const TOKEN_KEY = "polymock_token";
const USER_KEY = "polymock_user";

// ============================================================
// Helper Functions
// ============================================================

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ============================================================
// Auth Store
// ============================================================

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),

  login: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
