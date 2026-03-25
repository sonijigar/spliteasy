import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import FriendsScreen from '../screens/FriendsScreen';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

jest.mock('../context/AuthContext');
jest.mock('../services/api');

const mockUser = { _id: 'u1', name: 'Alice', phone: '+15550001', qrCode: 'spliteasy:u1' };

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser });
  api.getFriends.mockResolvedValue({ friends: [] });
  api.addFriendByPhone.mockResolvedValue({ friend: { _id: 'u2', name: 'Bob' } });
  api.removeFriend.mockResolvedValue({ success: true });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('FriendsScreen', () => {
  it('renders empty state when no friends', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('No friends yet')).toBeTruthy());
  });

  it('renders friends list', async () => {
    api.getFriends.mockResolvedValue({
      friends: [
        { _id: 'u2', name: 'Bob', phone: '+15550002' },
        { _id: 'u3', name: 'Carol', phone: '+15550003' },
      ],
    });
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('Bob')).toBeTruthy());
    expect(getByText('Carol')).toBeTruthy();
    expect(getByText('+15550002')).toBeTruthy();
  });

  it('shows friend count in header', async () => {
    api.getFriends.mockResolvedValue({
      friends: [{ _id: 'u2', name: 'Bob' }, { _id: 'u3', name: 'Carol' }],
    });
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('Friends (2)')).toBeTruthy());
  });

  it('toggles Add by Phone panel', async () => {
    const { getByText, queryByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('By Phone')).toBeTruthy());
    expect(queryByText("Friend's Phone Number")).toBeNull();
    fireEvent.press(getByText('By Phone'));
    expect(getByText("Friend's Phone Number")).toBeTruthy();
    // Toggle off
    fireEvent.press(getByText('By Phone'));
    expect(queryByText("Friend's Phone Number")).toBeNull();
  });

  it('adds a friend by phone number', async () => {
    api.addFriendByPhone.mockResolvedValue({ friend: { _id: 'u2', name: 'Bob' } });
    // After adding, loadFriends is called again – return updated list
    api.getFriends
      .mockResolvedValueOnce({ friends: [] })
      .mockResolvedValue({ friends: [{ _id: 'u2', name: 'Bob', phone: '+15550002' }] });

    const { getByText, getByPlaceholderText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('By Phone')).toBeTruthy());

    fireEvent.press(getByText('By Phone'));
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0456'), '+15550002');
    fireEvent.press(getByText('Add Friend'));

    await waitFor(() => expect(api.addFriendByPhone).toHaveBeenCalledWith('+15550002'));
    await waitFor(() => expect(getByText('Bob')).toBeTruthy());
  });

  it('shows error on addFriend failure', async () => {
    api.addFriendByPhone.mockRejectedValue(new Error('User not found'));
    const { getByText, getByPlaceholderText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('By Phone')).toBeTruthy());

    fireEvent.press(getByText('By Phone'));
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0456'), '+15550099');
    fireEvent.press(getByText('Add Friend'));

    await waitFor(() => expect(getByText('User not found')).toBeTruthy());
  });

  it('toggles QR code panel showing user qrCode', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => expect(getByText('My QR Code')).toBeTruthy());
    fireEvent.press(getByText('My QR Code'));
    expect(getByText('spliteasy:u1')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
  });
});
