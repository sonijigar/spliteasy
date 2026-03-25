import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

jest.mock('../context/AuthContext');
jest.mock('../services/api');

const mockNavigation = { navigate: jest.fn() };

const mockUser = { _id: 'u1', name: 'Alice' };

const emptyBalances = {
  balances: [],
  summary: { totalOwedToYou: 0, totalYouOwe: 0, netBalance: 0 },
};

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser, signOut: jest.fn() });
  api.getExpenses.mockResolvedValue({ expenses: [] });
  api.getBalances.mockResolvedValue(emptyBalances);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('HomeScreen', () => {
  it('renders user greeting', async () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Alice')).toBeTruthy());
    expect(getByText('Welcome back,')).toBeTruthy();
  });

  it('shows empty state when no expenses', async () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('No expenses yet')).toBeTruthy());
  });

  it('shows zero balance card', async () => {
    const { getAllByText, getByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('You are owed overall')).toBeTruthy());
    // Three $0.00 texts: net balance + "You owe" pill + "Owed to you" pill
    expect(getAllByText('$0.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows positive net balance correctly', async () => {
    api.getBalances.mockResolvedValue({
      balances: [{ userId: 'u2', name: 'Bob', amount: 30 }],
      summary: { totalOwedToYou: 30, totalYouOwe: 0, netBalance: 30 },
    });
    const { getAllByText, getByText } = render(<HomeScreen navigation={mockNavigation} />);
    // Wait for the async data to load and update state
    await waitFor(() => expect(getAllByText('$30.00').length).toBeGreaterThanOrEqual(1));
    expect(getByText('You are owed overall')).toBeTruthy();
  });

  it('shows negative net balance correctly', async () => {
    api.getBalances.mockResolvedValue({
      balances: [{ userId: 'u2', name: 'Bob', amount: -20 }],
      summary: { totalOwedToYou: 0, totalYouOwe: 20, netBalance: -20 },
    });
    const { getAllByText, getByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('You owe overall')).toBeTruthy());
    expect(getAllByText('$20.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders expense list', async () => {
    api.getExpenses.mockResolvedValue({
      expenses: [
        {
          _id: 'e1',
          description: 'Pizza',
          amount: 40,
          category: 'food',
          paidBy: { _id: 'u1', name: 'Alice' },
          splitWith: ['u1', 'u2'],
        },
      ],
    });
    const { getByText, getAllByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Pizza')).toBeTruthy());
    expect(getAllByText('$40.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders balance rows for friends', async () => {
    api.getBalances.mockResolvedValue({
      balances: [
        { userId: 'u2', name: 'Bob', amount: 15 },
        { userId: 'u3', name: 'Carol', amount: -10 },
      ],
      summary: { totalOwedToYou: 15, totalYouOwe: 10, netBalance: 5 },
    });
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Bob')).toBeTruthy());
    expect(getByText('Carol')).toBeTruthy();
    expect(getByText('owes you')).toBeTruthy();
    expect(getByText('you owe')).toBeTruthy();
  });
});
