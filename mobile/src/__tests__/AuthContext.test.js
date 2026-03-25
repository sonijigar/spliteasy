import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import * as SecureStore from 'expo-secure-store';

jest.mock('../services/api');
jest.mock('expo-secure-store');

// Helper component to expose AuthContext values in tests
function TestConsumer({ onValue }) {
  const ctx = useAuth();
  onValue(ctx);
  return <Text>ok</Text>;
}

const renderWithProvider = (onValue) =>
  render(
    <AuthProvider>
      <TestConsumer onValue={onValue} />
    </AuthProvider>
  );

beforeEach(() => {
  SecureStore._reset();
  SecureStore.getItemAsync.mockResolvedValue(null);
  jest.resetAllMocks();
  SecureStore.getItemAsync.mockResolvedValue(null);
  SecureStore.setItemAsync.mockResolvedValue();
  SecureStore.deleteItemAsync.mockResolvedValue();
});

describe('AuthContext', () => {
  it('starts with user=null and loading=false after mount with no token', async () => {
    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user).toBeNull();
  });

  it('restores user from stored token on mount', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('saved-token');
    api.getMe.mockResolvedValueOnce({ user: { _id: 'u1', name: 'Alice' } });
    api.setToken = jest.fn();

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(ctx.user).toEqual({ _id: 'u1', name: 'Alice' });
  });

  it('signIn sets user and saves token', async () => {
    api.login.mockResolvedValueOnce({ user: { _id: 'u1', name: 'Alice' }, token: 'tok' });
    api.setToken = jest.fn();

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => { await ctx.signIn('+1555', 'pass'); });

    expect(api.login).toHaveBeenCalledWith('+1555', 'pass');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'tok');
    expect(ctx.user).toEqual({ _id: 'u1', name: 'Alice' });
  });

  it('signUp sets user and saves token', async () => {
    api.register.mockResolvedValueOnce({ user: { _id: 'u2', name: 'Bob' }, token: 'tok2' });
    api.setToken = jest.fn();

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => { await ctx.signUp('Bob', '+1556', 'pass'); });

    expect(api.register).toHaveBeenCalledWith('Bob', '+1556', 'pass');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'tok2');
    expect(ctx.user).toEqual({ _id: 'u2', name: 'Bob' });
  });

  it('signOut clears user and token', async () => {
    api.login.mockResolvedValueOnce({ user: { _id: 'u1', name: 'Alice' }, token: 'tok' });
    api.setToken = jest.fn();

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => { await ctx.signIn('+1555', 'pass'); });
    expect(ctx.user).not.toBeNull();

    await act(async () => { await ctx.signOut(); });
    expect(ctx.user).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
  });

  it('clears bad stored token on mount error', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('bad-token');
    api.getMe.mockRejectedValueOnce(new Error('Token expired'));
    api.setToken = jest.fn();

    let ctx;
    renderWithProvider((c) => { ctx = c; });
    await waitFor(() => expect(ctx.loading).toBe(false));

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
    expect(ctx.user).toBeNull();
  });

  it('throws when useAuth used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer onValue={() => {}} />)).toThrow(
      'useAuth must be used within AuthProvider'
    );
    spy.mockRestore();
  });
});
