import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Member } from '../api/types';
import { api } from '../api/endpoints';
import { setAuthToken, setOnUnauthorized } from '../api/client';

interface AuthContextType {
  token: string | null;
  member: Member | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  switchUser: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'hisaab_auth_token';
const MEMBER_KEY = 'hisaab_auth_member';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      setAuthToken(null);
      setToken(null);
      setMember(null);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(MEMBER_KEY);
    } catch (e) {
      console.warn('Error during logout:', e);
    }
  }, []);

  const login = useCallback(async (username: string, password = 'pass1234') => {
    const res = await api.login(username, password);
    setAuthToken(res.token);
    setToken(res.token);
    setMember(res.member);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    await SecureStore.setItemAsync(MEMBER_KEY, JSON.stringify(res.member));
  }, []);

  const switchUser = useCallback(async (username: string) => {
    await login(username, 'pass1234');
  }, [login]);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });

    async function loadStoredAuth() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedMember = await SecureStore.getItemAsync(MEMBER_KEY);

        if (storedToken && storedMember) {
          setAuthToken(storedToken);
          setToken(storedToken);
          setMember(JSON.parse(storedMember));
        }
      } catch (err) {
        console.warn('Failed to restore auth from SecureStore:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredAuth();
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        member,
        isLoading,
        login,
        switchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
