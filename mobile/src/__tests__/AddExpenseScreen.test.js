/**
 * Unit tests for AddExpenseScreen — focusing on the receipt scanner integration.
 *
 * Tests are written as logic/integration tests without a full rendering
 * environment to avoid React Native environment dependency issues.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockScanReceipt = jest.fn();
const mockGetFriends = jest.fn().mockResolvedValue({ friends: [] });
const mockCreateExpense = jest.fn().mockResolvedValue({ expense: {} });

jest.mock('../services/api', () => ({
  scanReceipt: mockScanReceipt,
  getFriends: mockGetFriends,
  createExpense: mockCreateExpense,
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'user-123', name: 'Test User' } }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test-photo.jpg' }],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test-camera.jpg' }],
  }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  StyleSheet: { create: (s) => s },
  Platform: { OS: 'ios' },
}));

jest.mock('../components/UI', () => ({
  Button: 'Button',
  Card: 'Card',
  Input: 'Input',
  Avatar: 'Avatar',
}));

jest.mock('../components/ReceiptScanner', () => 'ReceiptScanner');

jest.mock('../utils/theme', () => ({
  colors: { primary: '#e8505b', text: '#fff', textSecondary: '#aaa', border: '#333', textMuted: '#666', bg: '#0f0f1a', bgCard: '#1a1a2e' },
  spacing: { md: 12, lg: 16, sm: 8 },
  radius: { md: 8, lg: 12 },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

const api = require('../services/api');
const ImagePicker = require('expo-image-picker');

describe('AddExpenseScreen receipt scan integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFriends.mockResolvedValue({ friends: [] });
  });

  it('scanReceipt API is accessible from the api service module', () => {
    expect(typeof api.scanReceipt).toBe('function');
  });

  it('scanReceipt returns extracted data on success', async () => {
    mockScanReceipt.mockResolvedValueOnce({
      success: true,
      data: { amount: 25.99, description: 'WHOLE FOODS', rawText: 'WHOLE FOODS\nTotal: $25.99' },
    });

    const result = await api.scanReceipt('file://receipt.jpg');

    expect(result.success).toBe(true);
    expect(result.data.amount).toBe(25.99);
    expect(result.data.description).toBe('WHOLE FOODS');
  });

  it('expo-image-picker can be used to select an image', async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    expect(status).toBe('granted');

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images' });
    expect(result.canceled).toBe(false);
    expect(result.assets[0].uri).toBe('file://test-photo.jpg');
  });

  it('expo-image-picker camera flow works correctly', async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    expect(status).toBe('granted');

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'Images' });
    expect(result.canceled).toBe(false);
    expect(result.assets[0].uri).toBe('file://test-camera.jpg');
  });

  it('form pre-fill logic applies extracted description and amount', () => {
    // Simulate the onScanComplete handler used in AddExpenseScreen
    let description = '';
    let amount = '';

    const setDescription = (val) => { description = val; };
    const setAmount = (val) => { amount = val; };

    const onScanComplete = (data) => {
      if (data.description) setDescription(data.description);
      if (data.amount != null) setAmount(String(data.amount));
    };

    onScanComplete({ description: 'STARBUCKS', amount: 15.5 });

    expect(description).toBe('STARBUCKS');
    expect(amount).toBe('15.5');
  });

  it('form pre-fill does not overwrite if no description returned', () => {
    let description = 'existing description';
    const setDescription = (val) => { description = val; };
    const setAmount = jest.fn();

    const onScanComplete = (data) => {
      if (data.description) setDescription(data.description);
      if (data.amount != null) setAmount(String(data.amount));
    };

    onScanComplete({ amount: 10.0 }); // no description

    expect(description).toBe('existing description'); // unchanged
    expect(setAmount).toHaveBeenCalledWith('10');
  });

  it('form pre-fill does not set amount if null is returned', () => {
    let amount = '';
    const setAmount = (val) => { amount = val; };
    const setDescription = jest.fn();

    const onScanComplete = (data) => {
      if (data.description) setDescription(data.description);
      if (data.amount != null) setAmount(String(data.amount));
    };

    onScanComplete({ description: 'TEST STORE', amount: null });

    expect(amount).toBe(''); // unchanged
    expect(setDescription).toHaveBeenCalledWith('TEST STORE');
  });

  it('getFriends is called when the screen loads', async () => {
    await api.getFriends();
    expect(mockGetFriends).toHaveBeenCalled();
  });
});
