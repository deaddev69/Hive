"use client";

import React, { createContext, useContext, useState } from "react";

export interface SessionUser {
  clerkId: string;
  role: "customer" | "boutique_owner" | "admin";
  email: string;
  name: string;
}

export interface SessionState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SessionContextType extends SessionState {
  loginAsMockUser: (role?: "customer" | "boutique_owner" | "admin") => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SessionState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const loginAsMockUser = (role: "customer" | "boutique_owner" | "admin" = "customer") => {
    setState({
      isLoading: false,
      isAuthenticated: true,
      user: {
        clerkId: "mock_clerk_id_1234",
        role,
        email: `${role}@tailorbee.in`,
        name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      },
    });
  };

  const logout = () => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <SessionContext.Provider value={{ ...state, loginAsMockUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionStore = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionStore must be used within a SessionProvider");
  }
  return context;
};
