
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AuthenticatedUser } from '../types';
import { apiService } from '../services/apiService';

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (token: string, userDetails: any) => void;
  logout: () => void;
  hasPermission: (allowedRoles: number[]) => boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser: AuthenticatedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        apiService.setToken(parsedUser.token);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (token: string, userDetails: any) => {
    const userData: AuthenticatedUser = {
      token,
      schoolId: userDetails.schoolID,
      userId: userDetails.userID,
      userName: userDetails.userName,
      email: userDetails.email,
      roleId: userDetails.roleID,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    apiService.setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    apiService.setToken(null);
  };

  const hasPermission = useCallback((allowedRoles: number[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.roleId);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
