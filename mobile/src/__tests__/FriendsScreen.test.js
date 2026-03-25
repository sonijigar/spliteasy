import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
}));

// Mock expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((cb) => { cb(); }),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

// Mock AuthContext
const mockUser = {
  _id: 'user123',
  name: 'John Doe',
  phone: '+1 555 0100',
  qrCode: 'spliteasy:user123',
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock API
jest.mock('../services/api', () => ({
  getFriends: jest.fn(() => Promise.resolve({ friends: [] })),
  addFriendByPhone: jest.fn(() => Promise.resolve({ success: true })),
  addFriendByQR: jest.fn(() => Promise.resolve({ success: true })),
  removeFriend: jest.fn(() => Promise.resolve({ success: true })),
}));

import * as api from '../services/api';
import { useCameraPermissions } from 'expo-camera';
import FriendsScreen from '../screens/FriendsScreen';

describe('FriendsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getFriends.mockResolvedValue({ friends: [] });
    useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
  });

  it('renders the Friends screen with action buttons', async () => {
    const { getAllByText, getByText } = render(<FriendsScreen />);
    await waitFor(() => {
      // Title "Friends" appears at least once
      expect(getAllByText('Friends').length).toBeGreaterThanOrEqual(1);
      expect(getByText('By Phone')).toBeTruthy();
      expect(getByText('My QR Code')).toBeTruthy();
      expect(getByText('Scan QR')).toBeTruthy();
    });
  });

  it('shows empty state when no friends', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => {
      expect(getByText('No friends yet')).toBeTruthy();
    });
  });

  it('shows friends list when friends exist', async () => {
    api.getFriends.mockResolvedValue({
      friends: [
        { _id: 'f1', name: 'Alice Smith', phone: '+1 555 0200' },
        { _id: 'f2', name: 'Bob Jones', phone: '+1 555 0300' },
      ],
    });
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('Bob Jones')).toBeTruthy();
    });
  });

  it('shows phone input when By Phone button is pressed', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => getByText('By Phone'));
    fireEvent.press(getByText('By Phone'));
    expect(getByText("Friend's Phone Number")).toBeTruthy();
  });

  it('shows QR code when My QR Code button is pressed', async () => {
    const { getByText } = render(<FriendsScreen />);
    await waitFor(() => getByText('My QR Code'));
    fireEvent.press(getByText('My QR Code'));
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('spliteasy:user123')).toBeTruthy();
  });

  describe('Scan QR tab', () => {
    it('renders camera component when Scan QR is pressed and permission is granted', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));
      await waitFor(() => {
        expect(getByTestId('camera-view')).toBeTruthy();
      });
    });

    it('shows permission request when camera permission is not granted', async () => {
      useCameraPermissions.mockReturnValue([{ granted: false }, jest.fn()]);
      const { getByText } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));
      await waitFor(() => {
        expect(getByText('Camera Permission Required')).toBeTruthy();
        expect(getByText('Grant Camera Access')).toBeTruthy();
      });
    });

    it('shows instructions to use By Phone when camera is denied', async () => {
      useCameraPermissions.mockReturnValue([{ granted: false }, jest.fn()]);
      const { getByText } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));
      await waitFor(() => {
        expect(getByText(/denied.*use.*By Phone/i)).toBeTruthy();
      });
    });

    it('calls requestPermission when Grant Camera Access is pressed', async () => {
      const mockRequestPermission = jest.fn();
      useCameraPermissions.mockReturnValue([{ granted: false }, mockRequestPermission]);
      const { getByText } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));
      await waitFor(() => getByText('Grant Camera Access'));
      fireEvent.press(getByText('Grant Camera Access'));
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('shows hint to point camera at QR code when permission granted', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      const { getByText } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));
      await waitFor(() => {
        expect(getByText("Point your camera at a friend's SplitEasy QR code")).toBeTruthy();
      });
    });
  });

  describe('QR code scanning', () => {
    it('successfully adds friend when valid QR code is scanned', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      api.addFriendByQR.mockResolvedValue({ success: true });

      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));

      const cameraView = await waitFor(() => getByTestId('camera-view'));
      fireEvent(cameraView, 'BarcodeScanned', { data: 'spliteasy:friend123' });

      await waitFor(() => {
        expect(api.addFriendByQR).toHaveBeenCalledWith('spliteasy:friend123');
        expect(getByText('Friend added successfully!')).toBeTruthy();
      });
    });

    it('shows error when invalid QR code is scanned', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);

      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));

      const cameraView = await waitFor(() => getByTestId('camera-view'));
      fireEvent(cameraView, 'BarcodeScanned', { data: 'https://example.com/notaspliteasycode' });

      await waitFor(() => {
        expect(api.addFriendByQR).not.toHaveBeenCalled();
        expect(getByText('Invalid QR code. Please scan a SplitEasy friend code.')).toBeTruthy();
      });
    });

    it('shows error when addFriendByQR API call fails', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      api.addFriendByQR.mockRejectedValue(new Error('User not found'));

      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));

      const cameraView = await waitFor(() => getByTestId('camera-view'));
      fireEvent(cameraView, 'BarcodeScanned', { data: 'spliteasy:unknownuser' });

      await waitFor(() => {
        expect(getByText('User not found')).toBeTruthy();
      });
    });

    it('shows Scan Another button after successful scan', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      api.addFriendByQR.mockResolvedValue({ success: true });

      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));

      const cameraView = await waitFor(() => getByTestId('camera-view'));
      fireEvent(cameraView, 'BarcodeScanned', { data: 'spliteasy:friend456' });

      await waitFor(() => {
        expect(getByText('Scan Another')).toBeTruthy();
      });
    });

    it('reloads friends list after successful scan', async () => {
      useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
      api.addFriendByQR.mockResolvedValue({ success: true });
      api.getFriends.mockResolvedValue({ friends: [] });

      const initialCallCount = api.getFriends.mock.calls.length;

      const { getByText, getByTestId } = render(<FriendsScreen />);
      await waitFor(() => getByText('Scan QR'));
      fireEvent.press(getByText('Scan QR'));

      const cameraView = await waitFor(() => getByTestId('camera-view'));
      const callCountBeforeScan = api.getFriends.mock.calls.length;
      fireEvent(cameraView, 'BarcodeScanned', { data: 'spliteasy:friend789' });

      await waitFor(() => {
        // getFriends called at least once more after successful add
        expect(api.getFriends.mock.calls.length).toBeGreaterThan(callCountBeforeScan);
      });
    });
  });
});
