import { createContext, useContext, useEffect, useState } from "react";

import { loginUser, logoutUser, refreshToken } from "../services/authService";

const AuthContext = createContext(null);

const API_URL = "http://localhost:3000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const data = await refreshToken();

        const response = await fetch(`${API_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Unable to restore session");
        }

        const profile = await response.json();

        if (active) {
          setAccessToken(data.accessToken);
          setUser(profile.user ?? profile);
        }
      } catch {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    const data = await loginUser({ email, password });

    setAccessToken(data.accessToken);
    setUser(data.user);

    return data;
  }

  async function logout() {
    try {
      await logoutUser();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        isAuthenticated: Boolean(user && accessToken),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
