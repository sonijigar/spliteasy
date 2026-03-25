/**
 * Manual mock for expo-image-picker used in Jest tests.
 */
const launchImageLibraryAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'file://test-photo.jpg' }],
});

const launchCameraAsync = jest.fn().mockResolvedValue({
  canceled: false,
  assets: [{ uri: 'file://test-camera.jpg' }],
});

const requestMediaLibraryPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ status: 'granted' });

const requestCameraPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ status: 'granted' });

const MediaTypeOptions = {
  Images: 'Images',
  Videos: 'Videos',
  All: 'All',
};

module.exports = {
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  MediaTypeOptions,
};
