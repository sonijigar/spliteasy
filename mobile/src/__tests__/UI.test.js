import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Avatar, Card, Button, Input, EmptyState } from '../components/UI';

describe('Avatar', () => {
  it('renders initials from a single-word name', () => {
    const { getByText } = render(<Avatar name="Alice" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('renders two initials from a multi-word name', () => {
    const { getByText } = render(<Avatar name="John Doe" />);
    expect(getByText('JD')).toBeTruthy();
  });

  it('renders without crashing for empty name', () => {
    const { UNSAFE_root } = render(<Avatar name="" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders without crashing for custom size', () => {
    const { getByText } = render(<Avatar name="A" size={50} />);
    expect(getByText('A')).toBeTruthy();
  });
});

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(<Card><Text>Hello</Text></Card>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Card onPress={onPress}><Text>Press me</Text></Card>);
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders as View when no onPress provided', () => {
    const { getByText } = render(<Card><Text>Static</Text></Card>);
    expect(getByText('Static')).toBeTruthy();
  });
});

describe('Button', () => {
  it('renders title', () => {
    const { getByText } = render(<Button title="Click Me" onPress={() => {}} />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Go" onPress={onPress} />);
    fireEvent.press(getByText('Go'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Go" onPress={() => {}} loading />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    expect(queryByText('Go')).toBeNull();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Go" onPress={onPress} disabled />);
    fireEvent.press(getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('renders label and input', () => {
    const { getByText, getByPlaceholderText } = render(
      <Input label="Phone" placeholder="Enter phone" value="" onChangeText={() => {}} />
    );
    expect(getByText('Phone')).toBeTruthy();
    expect(getByPlaceholderText('Enter phone')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(
      <Input label="Field" error="Required" value="" onChangeText={() => {}} />
    );
    expect(getByText('Required')).toBeTruthy();
  });

  it('calls onChangeText on user input', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="type here" value="" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });
});

describe('EmptyState', () => {
  it('renders title and subtitle', () => {
    const { getByText } = render(
      <EmptyState title="Nothing here" subtitle="Add something to get started" />
    );
    expect(getByText('Nothing here')).toBeTruthy();
    expect(getByText('Add something to get started')).toBeTruthy();
  });

  it('renders without subtitle', () => {
    const { getByText, queryByText } = render(<EmptyState title="Empty" />);
    expect(getByText('Empty')).toBeTruthy();
    expect(queryByText('Add something')).toBeNull();
  });
});
