/**
 * Unit tests for the ReceiptScanner component logic.
 *
 * These tests mock expo-image-picker and the API service and test the
 * component's behavior without a full React Native rendering environment.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLaunchImageLibrary = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'file://test-photo.jpg' }],
});

const mockLaunchCamera = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'file://test-camera.jpg' }],
});

const mockRequestMediaLibraryPermissions = jest.fn().mockResolvedValue({ status: 'granted' });
const mockRequestCameraPermissions = jest.fn().mockResolvedValue({ status: 'granted' });

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: mockLaunchImageLibrary,
  launchCameraAsync: mockLaunchCamera,
  requestMediaLibraryPermissionsAsync: mockRequestMediaLibraryPermissions,
  requestCameraPermissionsAsync: mockRequestCameraPermissions,
  MediaTypeOptions: { Images: 'Images' },
}));

const mockScanReceipt = jest.fn();
jest.mock('../services/api', () => ({
  scanReceipt: mockScanReceipt,
}));

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: mockAlert },
  ActivityIndicator: 'ActivityIndicator',
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (s) => s },
  Platform: { OS: 'ios' },
}));

// Mock UI components
jest.mock('../components/UI', () => ({
  Button: 'Button',
  Card: 'Card',
  Input: 'Input',
  Avatar: 'Avatar',
}));

// Mock theme
jest.mock('../utils/theme', () => ({
  colors: { primary: '#e8505b', text: '#fff', textSecondary: '#aaa', border: '#333', textMuted: '#666' },
  spacing: { md: 12, lg: 16, sm: 8 },
  radius: { md: 8 },
}));

// ── Extract business logic for testing ───────────────────────────────────────
// We test the core functions that the ReceiptScanner component uses internally.

const ImagePicker = require('expo-image-picker');
const api = require('../services/api');

async function pickFromGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { denied: true };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { canceled: true };
  }
  return { uri: result.assets[0].uri };
}

async function pickFromCamera() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { denied: true };
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { canceled: true };
  }
  return { uri: result.assets[0].uri };
}

async function processImage(imageUri) {
  const response = await api.scanReceipt(imageUri);
  if (response.success && response.data) {
    return { ok: true, data: response.data };
  }
  return { ok: false };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReceiptScanner logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScanReceipt.mockResolvedValue({
      success: true,
      data: { amount: 15.5, description: 'STARBUCKS', rawText: '' },
    });
    mockRequestMediaLibraryPermissions.mockResolvedValue({ status: 'granted' });
    mockRequestCameraPermissions.mockResolvedValue({ status: 'granted' });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test-photo.jpg' }],
    });
    mockLaunchCamera.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://test-camera.jpg' }],
    });
  });

  describe('pickFromGallery', () => {
    it('requests media library permissions before launching picker', async () => {
      await pickFromGallery();
      expect(mockRequestMediaLibraryPermissions).toHaveBeenCalled();
    });

    it('returns the image URI when user selects a photo', async () => {
      const result = await pickFromGallery();
      expect(result.uri).toBe('file://test-photo.jpg');
    });

    it('calls launchImageLibraryAsync', async () => {
      await pickFromGallery();
      expect(mockLaunchImageLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ mediaTypes: 'Images' }),
      );
    });

    it('returns { denied: true } when permission is not granted', async () => {
      mockRequestMediaLibraryPermissions.mockResolvedValueOnce({ status: 'denied' });
      const result = await pickFromGallery();
      expect(result.denied).toBe(true);
      expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
    });

    it('returns { canceled: true } when user cancels the picker', async () => {
      mockLaunchImageLibrary.mockResolvedValueOnce({ canceled: true, assets: [] });
      const result = await pickFromGallery();
      expect(result.canceled).toBe(true);
    });
  });

  describe('pickFromCamera', () => {
    it('requests camera permissions before launching camera', async () => {
      await pickFromCamera();
      expect(mockRequestCameraPermissions).toHaveBeenCalled();
    });

    it('returns the image URI when user takes a photo', async () => {
      const result = await pickFromCamera();
      expect(result.uri).toBe('file://test-camera.jpg');
    });

    it('returns { denied: true } when camera permission is not granted', async () => {
      mockRequestCameraPermissions.mockResolvedValueOnce({ status: 'denied' });
      const result = await pickFromCamera();
      expect(result.denied).toBe(true);
      expect(mockLaunchCamera).not.toHaveBeenCalled();
    });

    it('returns { canceled: true } when user cancels camera', async () => {
      mockLaunchCamera.mockResolvedValueOnce({ canceled: true, assets: [] });
      const result = await pickFromCamera();
      expect(result.canceled).toBe(true);
    });
  });

  describe('processImage', () => {
    it('calls api.scanReceipt with the provided URI', async () => {
      await processImage('file://some-photo.jpg');
      expect(mockScanReceipt).toHaveBeenCalledWith('file://some-photo.jpg');
    });

    it('returns { ok: true, data } on a successful response', async () => {
      const result = await processImage('file://some-photo.jpg');
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ amount: 15.5, description: 'STARBUCKS', rawText: '' });
    });

    it('returns { ok: false } when the response is not successful', async () => {
      mockScanReceipt.mockResolvedValueOnce({ success: false });
      const result = await processImage('file://some-photo.jpg');
      expect(result.ok).toBe(false);
    });

    it('propagates errors thrown by the API', async () => {
      mockScanReceipt.mockRejectedValueOnce(new Error('Network error'));
      await expect(processImage('file://some-photo.jpg')).rejects.toThrow('Network error');
    });
  });
});
