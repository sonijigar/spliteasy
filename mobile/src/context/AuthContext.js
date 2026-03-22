import React, { createContext, useState, useEffect, useContext } from 'react';
import * as api from '../services/api';

// In-memory store — works in Expo Go for demo purposes.
// Swap back to expo-secure-store for production builds.
const _store = {};
const SecureStore = {
  getItemAsync: async (key) => _store[key] ?? null,
  setItemAsync: async (key, value) => { _store[key] = value; },
  deleteItemAsync: async (key) => { delete _store[key]; },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token on app launch
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          api.setToken(token);
          const { user } = await api.getMe();
          setUser(user);
        }
      } catch (error) {
        // Token expired or invalid — clear it
        await SecureStore.deleteItemAsync('token');
        api.setToken(null);
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
    await SecureStore.deleteItemAsync('token');
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
