import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

jest.mock('../context/AuthContext');
jest.mock('../services/api');

const mockNavigation = { goBack: jest.fn() };
const mockUser = { _id: 'u1', name: 'Alice' };

beforeEach(() => {
  useAuth.mockReturnValue({ user: mockUser });
  api.getFriends.mockResolvedValue({ friends: [] });
  api.createExpense.mockResolvedValue({ expense: { _id: 'e1' } });
  mockNavigation.goBack.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('AddExpenseScreen', () => {
  it('renders amount, description, and submit button', async () => {
    const { getByPlaceholderText, getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByPlaceholderText('0.00')).toBeTruthy());
    expect(getByPlaceholderText('e.g. Dinner at Olive Garden')).toBeTruthy();
    expect(getByText('Add Expense')).toBeTruthy();
  });

  it('shows all category options', async () => {
    const { getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Food')).toBeTruthy();
      expect(getByText('Transport')).toBeTruthy();
      expect(getByText('Shopping')).toBeTruthy();
      expect(getByText('Fun')).toBeTruthy();
      expect(getByText('Rent')).toBeTruthy();
      expect(getByText('Other')).toBeTruthy();
    });
  });

  it('shows validation error when amount is zero', async () => {
    // amount="0" passes the disabled check (!amount is false for "0") but fails
    // handleSubmit validation (parseFloat("0") <= 0)
    const { getByPlaceholderText, getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByPlaceholderText('0.00')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Test');
    fireEvent.changeText(getByPlaceholderText('0.00'), '0');
    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => expect(getByText('Please fill in all fields')).toBeTruthy());
  });

  it('submits and navigates back on success', async () => {
    const { getByPlaceholderText, getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByPlaceholderText('0.00')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('0.00'), '30');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Lunch');
    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => {
      expect(api.createExpense).toHaveBeenCalledWith('Lunch', 30, 'other', 'u1', ['u1']);
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('shows error on API failure', async () => {
    api.createExpense.mockRejectedValueOnce(new Error('Server error'));
    const { getByPlaceholderText, getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByPlaceholderText('0.00')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('0.00'), '30');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Lunch');
    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => expect(getByText('Server error')).toBeTruthy());
  });

  it('calculates per-person split amount', async () => {
    api.getFriends.mockResolvedValue({ friends: [{ _id: 'u2', name: 'Bob', phone: '+1' }] });
    const { getByPlaceholderText, getAllByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    // Bob appears in both "Paid by" chips and "Split with" list
    await waitFor(() => expect(getAllByText('Bob').length).toBeGreaterThanOrEqual(1));
    // Press the Bob in the Split With section (last occurrence) to toggle Bob in
    const bobs = getAllByText('Bob');
    fireEvent.press(bobs[bobs.length - 1]);
    fireEvent.changeText(getByPlaceholderText('0.00'), '60');
    // With 2 people (You + Bob selected), each owes $30.00
    await waitFor(() => expect(getAllByText('$30.00').length).toBeGreaterThanOrEqual(1));
  });

  it('renders friends in split list', async () => {
    api.getFriends.mockResolvedValue({ friends: [{ _id: 'u2', name: 'Carol', phone: '+1' }] });
    const { getAllByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    // Carol appears in both "Paid by" and "Split with" sections
    await waitFor(() => expect(getAllByText('Carol').length).toBeGreaterThanOrEqual(1));
  });
});
