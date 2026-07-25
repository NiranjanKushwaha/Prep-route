import { useEffect, useState, useCallback } from "react";
import { STORAGE_KEYS } from "@/constants/common.constant";
import type { AuthUser } from "@/interfaces/auth.interface";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.localStorage.getItem(STORAGE_KEYS.TOKEN);
    const u = window.localStorage.getItem(STORAGE_KEYS.USER);
    setToken(t);
    if (u) {
      try {
        setUser(JSON.parse(u));
      } catch {
        setUser(null);
      }
    }
    setReady(true);
  }, []);

  const signIn = useCallback((newToken: string, newUser: AuthUser) => {
    window.localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    window.localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEYS.TOKEN);
    window.localStorage.removeItem(STORAGE_KEYS.USER);
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, ready, signIn, signOut, isAuthenticated: !!token };
}
