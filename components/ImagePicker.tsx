import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../app/lib/supabase';
import CircularImageCropper from './CircularImageCropper';

interface ImagePickerProps {
  value: string;
  onImageSelected: (uri: string) => void;
  tableName: 'champions' | 'competitors';
  recordId?: string;
}

export default function CustomImagePicker({ value, onImageSelected, tableName, recordId }: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      console.log('Starting image pick process...');
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.log('Auth check:', { session: !!session, authError });
      
      if (authError || !session?.user) {
        console.error('Authentication error:', authError);
        Alert.alert('Authentication Required', 'Please sign in to upload images.');
        return;
      }

      // Request permissions
      console.log('Requesting media library permissions...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission result:', permissionResult);
      
      if (!permissionResult.granted) {
        console.error('Permission denied');
        Alert.alert('Permission Required', 'Permission to access media library is required!');
        return;
      }

      // Launch image picker
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // We'll handle cropping ourselves
        quality: 1.0, // High quality for cropping
      });
      console.log('Image picker result:', result);

      // Check if cancelled
      if (result.canceled) {
        console.log('Image picker cancelled');
        return;
      }

      // Show cropper with selected image
      if (result.assets && result.assets[0] && result.assets[0].uri) {
        const asset = result.assets[0];
        console.log('Selected asset:', { uri: asset.uri, type: asset.type });
        setSelectedImageUri(asset.uri);
        setShowCropper(true);
      } else {
        console.error('No valid asset found in result');
        Alert.alert('Error', 'No image was selected.');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCropComplete = async (croppedUri: string) => {
    setShowCropper(false);
    setLocalImageUri(croppedUri);
    await uploadImage(croppedUri);
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploading(true);
      console.log('Starting upload process...');
      
      // Validate image URI
      if (!imageUri) {
        throw new Error('Image URI is missing');
      }
      
      // Create file name with user ID for uniqueness
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || 'anonymous';
      const timestamp = Date.now();
      const fileName = `${userId}/${tableName}-${recordId || 'new'}-${timestamp}.jpg`;
      console.log('Generated filename:', fileName);
      
      // Use Expo's FileSystem to read the file as base64
      console.log('Reading file as base64...');
      
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to Uint8Array
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      console.log('File converted to byte array:', { size: byteArray.length });
      
      // Upload the byte array to Supabase
      console.log('Uploading to Supabase...');
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, byteArray, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      console.log('Upload result:', { data, error });
      
      if (error) {
        console.error('Supabase upload error details:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      console.log('Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      console.log('Public URL:', publicUrl);

      // CRITICAL FIX: Only update record if recordId is a valid UUID, not temp ID
      if (recordId && !recordId.startsWith('temp-')) {
        console.log('Updating record with new avatar URL...');
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ avatar: publicUrl })
          .eq('id', recordId);

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update record: ${updateError.message}`);
        } else {
          console.log('Record updated successfully');
        }
      } else {
        console.log('Skipping database update - using temp ID or no recordId');
      }

      onImageSelected(publicUrl);
      console.log('Upload process completed successfully');
      Alert.alert('Success', 'Image uploaded successfully!');
      
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const displayImage = localImageUri || value;

  return (
    <View style={{ alignItems: 'center', marginVertical: 10 }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        overflow: 'hidden'
      }}>
        {displayImage ? (
          <Image
            source={{ uri: displayImage }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        ) : (
          <Text style={{ fontSize: 24, color: '#666' }}>👤</Text>
        )}
      </View>
      
      <TouchableOpacity
        onPress={pickImage}
        disabled={uploading}
        style={{
          backgroundColor: uploading ? '#999' : '#007AFF',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8
        }}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {uploading ? 'Uploading...' : 'Choose Photo'}
        </Text>
      </TouchableOpacity>
      
      {uploading && (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 10 }} />
      )}

      <Modal
        visible={showCropper}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 50 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' }}>
              Adjust your photo
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 30, textAlign: 'center' }}>
              Move and pinch to crop your image within the circle
            </Text>
            
            {selectedImageUri && (
              <CircularImageCropper
                imageUri={selectedImageUri}
                onCropComplete={handleCropComplete}
                size={250}
              />
            )}
            
            <View style={{ flexDirection: 'row', marginTop: 40, gap: 20 }}>
              <TouchableOpacity
                onPress={() => setShowCropper(false)}
                style={{
                  backgroundColor: '#999',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => selectedImageUri && handleCropComplete(selectedImageUri)}
                style={{
                  backgroundColor: '#007AFF',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  flex: 1
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>
                  Choose
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}