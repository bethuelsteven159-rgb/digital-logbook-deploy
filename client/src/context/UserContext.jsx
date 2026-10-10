import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getCurrentUser } from "../api/userApi.js";
import { resetNotificationsStore } from "../hooks/useNotifications.js";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      return currentUser;
    } catch (err) {
      setUser(null);

      // 401 simply means there is currently no authenticated user.
      if (err.status !== 401) {
        setError(err.message);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("authToken");

    // The notifications feed is cached in module scope; reset it so
    // the next signed-in user never sees the previous user's feed.
    resetNotificationsStore();

    setUser(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      refreshUser,
      logout,
    }),
    [user, loading, error, refreshUser, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
}
