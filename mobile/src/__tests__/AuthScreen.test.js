import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext');

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

beforeEach(() => {
  useAuth.mockReturnValue({ signIn: mockSignIn, signUp: mockSignUp });
  mockSignIn.mockReset();
  mockSignUp.mockReset();
});

describe('AuthScreen', () => {
  it('renders Sign In mode by default', () => {
    const { getByText } = render(<AuthScreen />);
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account? Sign Up")).toBeTruthy();
  });

  it('toggles to Register mode', () => {
    const { getByText } = render(<AuthScreen />);
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Already have an account? Sign In')).toBeTruthy();
  });

  it('shows Name field only in register mode', () => {
    const { queryByText, getByText } = render(<AuthScreen />);
    expect(queryByText('Your Name')).toBeNull();
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    expect(getByText('Your Name')).toBeTruthy();
  });

  it('calls signIn with phone and password', async () => {
    mockSignIn.mockResolvedValueOnce();
    const { getByPlaceholderText, getByText } = render(<AuthScreen />);
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0123'), '+15550123');
    fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'secret');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith('+15550123', 'secret'));
  });

  it('calls signUp with name, phone, and password', async () => {
    mockSignUp.mockResolvedValueOnce();
    const { getByPlaceholderText, getByText } = render(<AuthScreen />);
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    fireEvent.changeText(getByPlaceholderText('e.g. Alex'), 'Alice');
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0123'), '+15550001');
    fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'mypass');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith('Alice', '+15550001', 'mypass'));
  });

  it('shows error when name is empty on register', async () => {
    const { getByPlaceholderText, getByText } = render(<AuthScreen />);
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0123'), '+15550001');
    fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'mypass');
    fireEvent.press(getByText('Create Account'));
    await waitFor(() => expect(getByText('Name is required')).toBeTruthy());
  });

  it('shows error message on signIn failure', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { getByPlaceholderText, getByText } = render(<AuthScreen />);
    fireEvent.changeText(getByPlaceholderText('e.g. +1 555 0123'), '+15550123');
    fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'wrong');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => expect(getByText('Invalid credentials')).toBeTruthy());
  });
});
