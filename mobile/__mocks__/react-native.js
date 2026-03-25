'use strict';

const React = require('react');

// Create mock component helper
const mockComponent = (name) => {
  const Component = ({ children, ...props }) => React.createElement(name, props, children);
  Component.displayName = name;
  return Component;
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  hairlineWidth: 1,
  absoluteFill: {},
  absoluteFillObject: {},
};

const View = mockComponent('View');
const Text = mockComponent('Text');
const TouchableOpacity = mockComponent('TouchableOpacity');
const TextInput = mockComponent('TextInput');
const ScrollView = mockComponent('ScrollView');
const Image = mockComponent('Image');
const ActivityIndicator = mockComponent('ActivityIndicator');
const FlatList = mockComponent('FlatList');
const SectionList = mockComponent('SectionList');
const Modal = mockComponent('Modal');
const Pressable = mockComponent('Pressable');
const SafeAreaView = mockComponent('SafeAreaView');
const Switch = mockComponent('Switch');
const TouchableHighlight = mockComponent('TouchableHighlight');
const TouchableNativeFeedback = mockComponent('TouchableNativeFeedback');
const TouchableWithoutFeedback = mockComponent('TouchableWithoutFeedback');
const KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');
const RefreshControl = mockComponent('RefreshControl');

const Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

const Animated = {
  Value: jest.fn(() => ({
    interpolate: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    setValue: jest.fn(),
    setOffset: jest.fn(),
  })),
  timing: jest.fn(() => ({ start: jest.fn() })),
  spring: jest.fn(() => ({ start: jest.fn() })),
  sequence: jest.fn(() => ({ start: jest.fn() })),
  parallel: jest.fn(() => ({ start: jest.fn() })),
  loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  event: jest.fn(),
  createAnimatedComponent: (Component) => Component,
  View: mockComponent('Animated.View'),
  Text: mockComponent('Animated.Text'),
  Image: mockComponent('Animated.Image'),
};

const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const Platform = {
  OS: 'ios',
  Version: 14,
  select: jest.fn((obj) => obj.ios || obj.default),
  isPad: false,
  isTV: false,
};

const Keyboard = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  dismiss: jest.fn(),
};

const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const BackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

const StatusBar = {
  setBarStyle: jest.fn(),
  setBackgroundColor: jest.fn(),
  setHidden: jest.fn(),
};

const PixelRatio = {
  get: jest.fn(() => 2),
  getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  roundToNearestPixel: jest.fn((size) => size),
  getFontScale: jest.fn(() => 1),
};

const NativeModules = {};

module.exports = {
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  FlatList,
  SectionList,
  Modal,
  Pressable,
  SafeAreaView,
  Switch,
  KeyboardAvoidingView,
  RefreshControl,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Keyboard,
  Linking,
  BackHandler,
  AppState,
  StatusBar,
  PixelRatio,
  NativeModules,
  // Common hooks
  useColorScheme: jest.fn(() => 'dark'),
  useWindowDimensions: jest.fn(() => ({ width: 375, height: 812, scale: 1, fontScale: 1 })),
};
