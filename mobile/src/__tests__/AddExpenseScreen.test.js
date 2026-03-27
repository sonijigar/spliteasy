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
      expect(api.createExpense).toHaveBeenCalledWith('Lunch', 30, 'other', 'u1', ['u1'], 'equal', undefined);
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

  it('renders split type selector with all options', async () => {
    const { getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Equal')).toBeTruthy();
      expect(getByText('Percentage')).toBeTruthy();
      expect(getByText('Exact')).toBeTruthy();
      expect(getByText('Shares')).toBeTruthy();
    });
  });

  it('shows split type label for equal split', async () => {
    const { getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText(/split equally with/i)).toBeTruthy());
  });

  it('shows custom split label when non-equal split type is selected', async () => {
    const { getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Percentage')).toBeTruthy());
    fireEvent.press(getByText('Percentage'));
    await waitFor(() => expect(getByText(/split with/i)).toBeTruthy());
  });

  it('shows validation error when percentage splits do not sum to 100', async () => {
    api.getFriends.mockResolvedValue({ friends: [{ _id: 'u2', name: 'Bob', phone: '+1' }] });
    const { getByText, getByPlaceholderText, getAllByText, getAllByTestId } = render(
      <AddExpenseScreen navigation={mockNavigation} />
    );
    await waitFor(() => expect(getAllByText('Bob').length).toBeGreaterThanOrEqual(1));

    // Select Percentage split type
    fireEvent.press(getByText('Percentage'));

    // Toggle Bob into the split
    const bobs = getAllByText('Bob');
    fireEvent.press(bobs[bobs.length - 1]);

    // Enter amount and description
    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Hotel');

    // Set Alice to 60% and Bob to 20% (doesn't sum to 100)
    const aliceInput = getAllByTestId('custom-split-u1');
    fireEvent.changeText(aliceInput[0], '60');
    const bobInput = getAllByTestId('custom-split-u2');
    fireEvent.changeText(bobInput[0], '20');

    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => expect(getByText(/percentages must sum to 100/i)).toBeTruthy());
  });

  it('shows validation error when exact amounts do not sum to total', async () => {
    api.getFriends.mockResolvedValue({ friends: [{ _id: 'u2', name: 'Bob', phone: '+1' }] });
    const { getByText, getByPlaceholderText, getAllByText, getAllByTestId } = render(
      <AddExpenseScreen navigation={mockNavigation} />
    );
    await waitFor(() => expect(getAllByText('Bob').length).toBeGreaterThanOrEqual(1));

    fireEvent.press(getByText('Exact'));

    const bobs = getAllByText('Bob');
    fireEvent.press(bobs[bobs.length - 1]);

    fireEvent.changeText(getByPlaceholderText('0.00'), '50');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Groceries');

    const aliceInput = getAllByTestId('custom-split-u1');
    fireEvent.changeText(aliceInput[0], '10');
    const bobInput = getAllByTestId('custom-split-u2');
    fireEvent.changeText(bobInput[0], '10');

    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => expect(getByText(/exact amounts must sum/i)).toBeTruthy());
  });

  it('submits with percentage split and passes correct args to api', async () => {
    api.getFriends.mockResolvedValue({ friends: [{ _id: 'u2', name: 'Bob', phone: '+1' }] });
    const { getByText, getByPlaceholderText, getAllByText, getAllByTestId } = render(
      <AddExpenseScreen navigation={mockNavigation} />
    );
    await waitFor(() => expect(getAllByText('Bob').length).toBeGreaterThanOrEqual(1));

    fireEvent.press(getByText('Percentage'));

    const bobs = getAllByText('Bob');
    fireEvent.press(bobs[bobs.length - 1]);

    fireEvent.changeText(getByPlaceholderText('0.00'), '100');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Hotel');

    const aliceInput = getAllByTestId('custom-split-u1');
    fireEvent.changeText(aliceInput[0], '70');
    const bobInput = getAllByTestId('custom-split-u2');
    fireEvent.changeText(bobInput[0], '30');

    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => {
      expect(api.createExpense).toHaveBeenCalledWith(
        'Hotel',
        100,
        'other',
        'u1',
        ['u1', 'u2'],
        'percentage',
        [
          { userId: 'u1', percentage: 70 },
          { userId: 'u2', percentage: 30 }
        ]
      );
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('submits with equal split and passes undefined customSplits', async () => {
    const { getByPlaceholderText, getByText } = render(<AddExpenseScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByPlaceholderText('0.00')).toBeTruthy());
    fireEvent.changeText(getByPlaceholderText('0.00'), '60');
    fireEvent.changeText(getByPlaceholderText('e.g. Dinner at Olive Garden'), 'Dinner');
    fireEvent.press(getByText('Add Expense'));
    await waitFor(() => {
      expect(api.createExpense).toHaveBeenCalledWith(
        'Dinner', 60, 'other', 'u1', ['u1'], 'equal', undefined
      );
    });
  });
});
