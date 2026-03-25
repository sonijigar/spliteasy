import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { cb(); },
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock the API service
jest.mock('../services/api', () => ({
  getGroups: jest.fn(),
  createGroup: jest.fn(),
  getFriends: jest.fn(() => Promise.resolve({ friends: [] })),
}));

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'user1', name: 'Alice' } }),
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const api = require('../services/api');

import GroupsScreen from '../screens/GroupsScreen';

const mockGroups = [
  {
    _id: 'group1',
    name: 'Road Trip 2024',
    description: 'Summer adventure',
    members: [
      { _id: 'user1', name: 'Alice' },
      { _id: 'user2', name: 'Bob' },
    ],
    createdBy: { _id: 'user1', name: 'Alice' },
  },
  {
    _id: 'group2',
    name: 'Apartment',
    description: null,
    members: [
      { _id: 'user1', name: 'Alice' },
    ],
    createdBy: { _id: 'user1', name: 'Alice' },
  },
];

describe('GroupsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders groups list when groups exist', async () => {
    api.getGroups.mockResolvedValue({ groups: mockGroups });

    const { getByText } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByText('Road Trip 2024')).toBeTruthy();
      expect(getByText('Apartment')).toBeTruthy();
    });
  });

  it('shows empty state when no groups', async () => {
    api.getGroups.mockResolvedValue({ groups: [] });

    const { getByText } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByText('No groups yet')).toBeTruthy();
    });
  });

  it('shows member count for each group', async () => {
    api.getGroups.mockResolvedValue({ groups: mockGroups });

    const { getByText } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByText('2 members')).toBeTruthy();
      expect(getByText('1 member')).toBeTruthy();
    });
  });

  it('renders create group button', async () => {
    api.getGroups.mockResolvedValue({ groups: [] });

    const { getByTestId } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByTestId('create-group-button')).toBeTruthy();
    });
  });

  it('navigates to group detail on group card press', async () => {
    api.getGroups.mockResolvedValue({ groups: mockGroups });

    const { getByTestId } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByTestId('group-card-group1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('group-card-group1'));

    expect(mockNavigate).toHaveBeenCalledWith('GroupDetail', {
      groupId: 'group1',
      groupName: 'Road Trip 2024',
    });
  });

  it('renders the Groups header title', async () => {
    api.getGroups.mockResolvedValue({ groups: [] });

    const { getByText } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      expect(getByText('Groups')).toBeTruthy();
    });
  });

  it('handles API error gracefully', async () => {
    api.getGroups.mockRejectedValue(new Error('Network error'));

    // Should not throw
    const { getByText } = render(
      <GroupsScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => {
      // Empty state shows since groups couldn't load
      expect(getByText('No groups yet')).toBeTruthy();
    });
  });
});
