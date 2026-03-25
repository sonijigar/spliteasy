import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as api from '../services/api';

const AuthContext = createContext(null);

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

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
          // Re-register push token in case it changed
          registerForPushNotifications().then((pushToken) => {
            if (pushToken) {
              api.updatePushToken(pushToken).catch(() => {});
            }
          });
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
    // Register push token after signup
    registerForPushNotifications().then((pushToken) => {
      if (pushToken) {
        api.updatePushToken(pushToken).catch(() => {});
      }
    });
  };

  const signIn = async (phone, password) => {
    const { user, token } = await api.login(phone, password);
    await SecureStore.setItemAsync('token', token);
    api.setToken(token);
    setUser(user);
    // Register push token after login
    registerForPushNotifications().then((pushToken) => {
      if (pushToken) {
        api.updatePushToken(pushToken).catch(() => {});
      }
    });
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

export { registerForPushNotifications };
