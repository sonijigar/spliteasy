import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import SettleScreen from '../screens/SettleScreen';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

jest.mock('../context/AuthContext');
jest.mock('../services/api');

const mockUser = { _id: 'u1', name: 'Alice' };

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser });
  api.getBalances.mockResolvedValue({ balances: [], summary: {} });
  api.getSettlements.mockResolvedValue({ settlements: [] });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('SettleScreen', () => {
  it('shows all settled up when no balances', async () => {
    const { getByText } = render(<SettleScreen />);
    await waitFor(() => expect(getByText('All settled up!')).toBeTruthy());
  });

  it('renders "You Owe" section for negative balances', async () => {
    api.getBalances.mockResolvedValue({
      balances: [{ userId: 'u2', name: 'Bob', amount: -25 }],
      summary: {},
    });
    const { getByText } = render(<SettleScreen />);
    await waitFor(() => expect(getByText('You Owe')).toBeTruthy());
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('$25.00')).toBeTruthy();
    expect(getByText('You owe them')).toBeTruthy();
    expect(getByText('Settle Up')).toBeTruthy();
  });

  it('renders "Owed to You" section for positive balances', async () => {
    api.getBalances.mockResolvedValue({
      balances: [{ userId: 'u2', name: 'Carol', amount: 40 }],
      summary: {},
    });
    const { getByText } = render(<SettleScreen />);
    await waitFor(() => expect(getByText('Owed to You')).toBeTruthy());
    expect(getByText('Carol')).toBeTruthy();
    expect(getByText('$40.00')).toBeTruthy();
    expect(getByText('Owes you')).toBeTruthy();
    expect(getByText('Record Payment')).toBeTruthy();
  });

  it('renders both owe and owed sections together', async () => {
    api.getBalances.mockResolvedValue({
      balances: [
        { userId: 'u2', name: 'Bob', amount: -15 },
        { userId: 'u3', name: 'Carol', amount: 20 },
      ],
      summary: {},
    });
    const { getByText } = render(<SettleScreen />);
    await waitFor(() => expect(getByText('You Owe')).toBeTruthy());
    expect(getByText('Owed to You')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Carol')).toBeTruthy();
  });

  it('renders settlement history', async () => {
    api.getSettlements.mockResolvedValue({
      settlements: [
        {
          _id: 's1',
          from: { _id: 'u1', name: 'Alice' },
          to: { _id: 'u2', name: 'Bob' },
          amount: 30,
          createdAt: '2026-01-15T00:00:00.000Z',
        },
      ],
    });
    const { getByText } = render(<SettleScreen />);
    await waitFor(() => expect(getByText('Settlement History')).toBeTruthy());
    expect(getByText('$30.00')).toBeTruthy();
    expect(getByText(/You.*paid.*Bob/)).toBeTruthy();
  });
});
