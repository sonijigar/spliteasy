/**
 * Manual mock for react-native used in Jest tests.
 * This provides lightweight stubs for RN components so tests can run
 * without the full React Native environment.
 */
const React = require('react');

const mockComponent = (name) => {
  const Component = ({ children, ...props }) => {
    return React.createElement(name, props, children);
  };
  Component.displayName = name;
  return Component;
};

const Alert = {
  alert: jest.fn(),
};

const ActivityIndicator = mockComponent('ActivityIndicator');
const View = mockComponent('View');
const Text = mockComponent('Text');
const TextInput = mockComponent('TextInput');
const TouchableOpacity = mockComponent('TouchableOpacity');
const ScrollView = mockComponent('ScrollView');
const KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');
const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
};
const Platform = { OS: 'ios', select: (obj) => obj.ios };

module.exports = {
  Alert,
  ActivityIndicator,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
};
