import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from './UI';
import { colors, spacing, radius } from '../utils/theme';
import * as api from '../services/api';

/**
 * ReceiptScanner component
 *
 * Renders a "Scan Receipt" button that allows the user to select a photo from
 * their gallery or take a photo with the camera. The image is sent to the
 * server for OCR processing and the extracted data (amount, description) is
 * returned via the onScanComplete callback.
 *
 * Props:
 *   onScanComplete(data) - called with { amount, description } when successful
 */
export default function ReceiptScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false);

  const requestAndPickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to scan receipts.',
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }
    return result.assets[0].uri;
  };

  const requestAndOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to scan receipts.',
      );
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }
    return result.assets[0].uri;
  };

  const processImage = async (imageUri) => {
    setScanning(true);
    try {
      const response = await api.scanReceipt(imageUri);
      if (response.success && response.data) {
        onScanComplete(response.data);
      } else {
        Alert.alert('Scan Failed', 'Could not extract data from the receipt. Please fill in the details manually.');
      }
    } catch (error) {
      Alert.alert('Scan Failed', 'Failed to process the receipt image. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleScanReceipt = () => {
    Alert.alert(
      'Scan Receipt',
      'Choose how to add your receipt photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const uri = await requestAndOpenCamera();
            if (uri) await processImage(uri);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const uri = await requestAndPickFromGallery();
            if (uri) await processImage(uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <View style={styles.scanningContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.scanningText}>Scanning receipt...</Text>
        </View>
      ) : (
        <Button
          title="Scan Receipt"
          variant="secondary"
          onPress={handleScanReceipt}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  button: {
    borderStyle: 'dashed',
  },
  scanningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanningText: {
    color: colors.textSecondary,
    fontSize: 15,
    marginLeft: 8,
  },
});
