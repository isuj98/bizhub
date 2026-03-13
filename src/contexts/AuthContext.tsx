import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getAuthToken, setAuthToken } from '../services/api';

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t = getAuthToken();
    if (t) {
      setTokenState(t);
      try {
        fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:5001'}/api/me`, {
          headers: { Authorization: `Bearer ${t}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.id && data?.email) setUser({ id: data.id, email: data.email });
          })
          .catch(() => setTokenState(null));
      } catch {
        setTokenState(null);
      }
    }
    setIsReady(true);
  }, []);

  const login = useCallback((t: string, u: User) => {
    setAuthToken(t);
    setTokenState(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
