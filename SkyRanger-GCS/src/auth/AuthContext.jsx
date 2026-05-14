import React, { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [role, setRole] = useState(() => localStorage.getItem("role"));
  const [username, setUsername] = useState(() => {
    if (token) {
      try {
        const payload = jwtDecode(token);
        return payload.sub ?? null;
      } catch {}
    }
    return null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
    setUsername(null);
  }, []);

  // Refresh user data on page reload (if token exists, verify its expiration)
  useEffect(() => {
    if (!token) return;
    try {
      const payload = jwtDecode(token);
      const now = Date.now() / 1000;
      if (payload.exp < now) {
        logout();
      } else {
        setRole(payload.role);
        setUsername(payload.sub);
      }
    } catch {
      logout();
    }
  }, [token, logout]);

  const value = { token, role, username, setToken, setRole, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
