// core/utils/imageUtils.js
// Compress any image URI before uploading to Supabase Storage.
// Caps at 1200px wide and 80% JPEG quality — cuts typical file size 60-70%
// with no visible quality loss on mobile screens.
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
