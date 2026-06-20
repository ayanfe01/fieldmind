import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { MediaItem } from '../../lib/types';

interface MediaUploaderProps {
  media: MediaItem[];
  onAdd: (item: MediaItem) => void;
  onRemove: (id: string) => void;
  label?: string;
  hint?: string;
  maxItems?: number;
}

export function MediaUploader({ media, onAdd, onRemove, label = 'Photos & Videos', hint = 'Help the service pro understand the job', maxItems = 6 }: MediaUploaderProps) {

  const pickMedia = () => {
    Alert.alert('Add Media', 'Choose an option', [
      { text: 'Take Photo', onPress: () => launchCamera() },
      { text: 'Photo Library', onPress: () => launchLibrary('Images') },
      { text: 'Video Library', onPress: () => launchLibrary('Videos') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addItem(result.assets[0].uri, 'image');
    }
  };

  const launchLibrary = async (type: 'Images' | 'Videos') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Library access required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'Images' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8, allowsMultipleSelection: true, selectionLimit: maxItems - media.length,
    });
    if (!result.canceled) {
      result.assets.forEach(asset => addItem(asset.uri, type === 'Videos' ? 'video' : 'image'));
    }
  };

  const addItem = (uri: string, type: 'image' | 'video') => {
    const item: MediaItem = {
      id: Math.random().toString(36).substr(2, 9),
      uri, type, uploadedAt: new Date().toISOString(),
    };
    onAdd(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{media.length}/{maxItems}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {media.map(item => (
            <View key={item.id} style={styles.thumb}>
              <Image source={{ uri: item.uri }} style={styles.thumbImage} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <MaterialCommunityIcons name="play-circle" size={24} color="#fff" />
                </View>
              )}
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.id)}>
                <MaterialCommunityIcons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {media.length < maxItems && (
            <TouchableOpacity style={styles.addThumb} onPress={pickMedia}>
              <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.textMuted} />
              <Text style={styles.addThumbText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  count: { fontSize: 12, color: COLORS.textMuted },
  hint: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: 4 },
  thumb: { width: 80, height: 80, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  removeBtn: { position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addThumb: { width: 80, height: 80, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addThumbText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
});
