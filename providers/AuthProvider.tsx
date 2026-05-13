"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi, tallyApi } from "@/lib/axios";

type User = { id: number; name: string; email: string };

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch the current user from Tally backend.
   * Tally reads the accessToken cookie → verifies JWT → returns user.
   * Called on mount and after login/register.
   */
  const refetchUser = useCallback(async () => {
    try {
      const { data } = await tallyApi.get<User>("/users/me");
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  // Verify session on every page load
  useEffect(() => {
    refetchUser().finally(() => setIsLoading(false));
  }, [refetchUser]);

  const logout = async () => {
    try {
      await authApi.post("/auth/logout");
    } catch {}
    window.location.replace("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
