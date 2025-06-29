"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "head_admin" | "manager" | "hr_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  companyName: string;
  isApproved: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: User[] = [
  {
    id: "1",
    name: "John Executive",
    email: "john@company.com",
    role: "head_admin",
    department: "Executive",
    position: "CEO",
    companyName: "ACME Corp",
    isApproved: true,
  },
  {
    id: "2",
    name: "Sarah Manager",
    email: "sarah@company.com",
    role: "manager",
    department: "Operations",
    position: "Operations Manager",
    companyName: "ACME Corp",
    isApproved: true,
  },
  {
    id: "3",
    name: "Mike HR",
    email: "mike@company.com",
    role: "hr_admin",
    department: "Human Resources",
    position: "HR Administrator",
    companyName: "ACME Corp",
    isApproved: true,
  },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call your API
    const foundUser = mockUsers.find((u) => u.email === email && u.isApproved);
    if (foundUser) {
      setUser(foundUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
