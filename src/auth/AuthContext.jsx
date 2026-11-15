import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, needsSetup: false });

  const refresh = useCallback(async () => {
    try {
      const { user, needsSetup } = await api("/api/auth?action=me");
      setState({ loading: false, user, needsSetup });
    } catch {
      setState({ loading: false, user: null, needsSetup: false });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username, password) => {
    const { user } = await api("/api/auth?action=login", { method: "POST", body: { username, password } });
    setState({ loading: false, user, needsSetup: false });
  };
  const logout = async () => {
    await api("/api/auth?action=logout", { method: "POST", body: {} }).catch(() => {});
    setState({ loading: false, user: null, needsSetup: false });
  };
  // After bootstrap / set-password the server has already started a session.
  const adopt = (user) => setState({ loading: false, user, needsSetup: false });

  return (
    <AuthContext.Provider value={{ ...state, login, logout, adopt, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
