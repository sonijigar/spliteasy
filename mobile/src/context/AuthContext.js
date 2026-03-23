import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await SecureStore.deleteItemAsync('token');
    api.setToken(null);
    setUser(null);
  }, []);

  // Check for stored token on app launch
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          if (api.isTokenExpired(token)) {
            await clearSession();
          } else {
            api.setToken(token);
            const { user } = await api.getMe();
            setUser(user);
          }
        }
      } catch (error) {
        // Token expired or invalid — clear it
        await clearSession();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const signUp = async (name, phone, password) => {
    const { user, token } = await api.register(name, phone, password);
    await SecureStore.setItemAsync('token', token);
    api.setToken(token);
    setUser(user);
  };

  const signIn = async (phone, password) => {
    const { user, token } = await api.login(phone, password);
    await SecureStore.setItemAsync('token', token);
    api.setToken(token);
    setUser(user);
  };

  const signOut = async () => {
    await clearSession();
  };

  // Call this whenever an API error is caught to handle token expiry uniformly
  const handleApiError = useCallback(async (error) => {
    if (error?.message === 'TOKEN_EXPIRED' || error?.message === 'Invalid or expired token') {
      await clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, handleApiError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
