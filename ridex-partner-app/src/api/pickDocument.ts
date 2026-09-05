import * as ImagePicker from 'expo-image-picker';

export type PickedFile = { uri: string; name: string; mimeType: string };

/**
 * Camera or library, the driver's choice at the OS prompt.
 *
 * Quality is capped at 0.7 and the longest edge at 2000px by the picker's own compression: the
 * server rejects anything past 8 MB, and a modern phone's full-resolution photo of a licence is
 * comfortably over that while being no more readable.
 */
export async function pickDocument(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('RideX needs access to your photos to upload a document.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0]!;
  return {
    uri: asset.uri,
    // The picker leaves fileName null on some Android providers, and the server needs a filename
    // on the part - not for storage, which ignores it, but for the multipart parser.
    name: asset.fileName ?? `document-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function takeDocumentPhoto(): Promise<PickedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('RideX needs camera access to photograph a document.');
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0]!;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `document-${Date.now()}.jpg`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}
