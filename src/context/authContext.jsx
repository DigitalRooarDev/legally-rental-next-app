"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserProfile } from "@/actions/getUserProfile";
import { logoutUser } from "@/actions/logoutUser";

/**
 * Client-side view of the session.
 *
 * The source of truth is the httpOnly cookie pair written by `storeUserSession`,
 * so this context never holds a token — only the profile the server resolved.
 * The root layout seeds `initialUser`, which means a signed-in visitor never
 * sees a "Sign In" flash while a client-side profile request is in flight.
 */
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ initialUser = null, children }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  /** Re-reads the profile after a mutation (profile edit, avatar upload, …). */
  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserProfile();
      if (data?.status) setUser(data.user);
      return data;
    } catch (error) {
      console.error("AUTH: profile refresh failed", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIsLoading(false);
      // `replace` so Back doesn't land on a protected page mid-history.
      router.replace("/");
      router.refresh();
    }
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      setUser,
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
