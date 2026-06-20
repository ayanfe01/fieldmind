import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Image, Alert, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore, PortfolioItem } from '../store/useAppStore';
import { Button } from '../components/ui/Button';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profilePhoto, portfolioItems, setProfilePhoto, addPortfolioItem, removePortfolioItem, logout } = useAppStore();
  const [captionModal, setCaptionModal] = useState(false);
  const [pendingUri, setPendingUri] = useState('');
  const [caption, setCaption] = useState('');
  const isTrade = user?.role === 'tradesperson';

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const takeProfilePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleProfilePhotoPress = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takeProfilePhoto },
      { text: 'Choose from Library', onPress: pickProfilePhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickPortfolioPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingUri(result.assets[0].uri);
      setCaptionModal(true);
    }
  };

  const savePortfolioItem = () => {
    const item: PortfolioItem = {
      id: Math.random().toString(36).substr(2, 9),
      uri: pendingUri, caption,
      createdAt: new Date().toISOString(),
    };
    addPortfolioItem(item);
    setCaptionModal(false);
    setCaption('');
    setPendingUri('');
  };

  const confirmRemove = (id: string) => {
    Alert.alert('Remove Photo', 'Remove this from your portfolio?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePortfolioItem(id) },
    ]);
  };

  const isVerified = !!user?.licenseNumber;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={handleProfilePhotoPress} activeOpacity={0.85}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{user?.name?.charAt(0) || 'F'}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Name + badge */}
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user?.name}</Text>
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            {isTrade && <Text style={styles.businessName}>{user?.businessName}</Text>}
            <View style={styles.roleTag}>
              <MaterialCommunityIcons
                name={isTrade ? 'briefcase-outline' : 'home-account'}
                size={12} color={isTrade ? COLORS.primary : '#7EA7D8'}
              />
              <Text style={[styles.roleTagText, { color: isTrade ? COLORS.primary : '#7EA7D8' }]}>
                {isTrade ? 'Service Pro' : 'Customer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoCard}>
            {[
              { icon: 'email-outline', label: 'Email', value: user?.email },
              { icon: 'phone-outline', label: 'Phone', value: user?.phone },
              ...(isTrade ? [
                { icon: 'map-marker-outline', label: 'Service Area', value: user?.serviceArea || 'Not set' },
                {
                  icon: 'cash-outline',
                  label: 'Pricing',
                  value: user?.pricingMode === 'hourly'
                    ? (user?.hourlyRate ? `$${user.hourlyRate}/hr` : 'Hourly')
                    : user?.pricingMode === 'fixed'
                    ? (user?.fixedRate ? `From $${user.fixedRate}` : 'Per session/job')
                    : 'Quote per request',
                },
                { icon: 'clock-outline', label: 'Experience', value: user?.yearsExperience ? `${user.yearsExperience} years` : 'Not set' },
                { icon: 'briefcase-outline', label: 'Service Category', value: user?.trade ? user.trade.replace('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Not set' },
              ] : [
                { icon: 'home-outline', label: 'Property', value: user?.propertyAddress || 'Not set' },
                { icon: 'office-building-outline', label: 'Type', value: user?.propertyType ? user.propertyType.charAt(0).toUpperCase() + user.propertyType.slice(1) : 'Not set' },
              ]),
            ].map((item, i) => (
              <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Verification for service pros */}
        {isTrade && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <View style={[styles.verifyCard, isVerified && styles.verifyCardActive]}>
              <MaterialCommunityIcons
                name={isVerified ? 'shield-check' : 'shield-outline'}
                size={32} color={isVerified ? COLORS.success : COLORS.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyTitle}>
                  {isVerified ? 'Account Verified' : 'Get Verified'}
                </Text>
                <Text style={styles.verifyDesc}>
                  {isVerified
                    ? `License: ${user?.licenseNumber} - Customers trust verified service pros`
                    : 'Add your license number or certification to earn a verified badge and get more requests'}
                </Text>
              </View>
              {!isVerified && (
                <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
              )}
            </View>
          </View>
        )}
        {/* Bio for service pros */}
        {isTrade && user?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{user.bio}</Text>
            </View>
          </View>
        )}
        {/* Portfolio for service pros */}
        {isTrade && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Portfolio</Text>
              <TouchableOpacity style={styles.addBtn} onPress={pickPortfolioPhoto}>
                <MaterialCommunityIcons name="plus" size={16} color={COLORS.primary} />
                <Text style={styles.addBtnText}>Add Photo</Text>
              </TouchableOpacity>
            </View>

            {portfolioItems.length === 0 ? (
              <TouchableOpacity style={styles.emptyPortfolio} onPress={pickPortfolioPhoto} activeOpacity={0.8}>
                <MaterialCommunityIcons name="image-plus" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyPortfolioTitle}>Showcase your work</Text>
                <Text style={styles.emptyPortfolioSub}>Add photos of completed work to attract more customers</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.portfolioGrid}>
                {portfolioItems.map(item => (
                  <View key={item.id} style={styles.portfolioItem}>
                    <Image source={{ uri: item.uri }} style={styles.portfolioImage} />
                    {item.caption ? (
                      <View style={styles.portfolioCaption}>
                        <Text style={styles.portfolioCaptionText} numberOfLines={1}>{item.caption}</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemove(item.id)}>
                      <MaterialCommunityIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Add more tile */}
                <TouchableOpacity style={styles.addPortfolioTile} onPress={pickPortfolioPhoto}>
                  <MaterialCommunityIcons name="plus" size={28} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Sign out */}
        <View style={styles.section}>
          <Button
            title="Sign Out"
            variant="secondary"
            onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                  await logout();
                  router.replace('/(auth)/welcome');
                },
              },
            ])}
          />
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Caption Modal */}
      <Modal visible={captionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add a Caption</Text>
            {pendingUri && (
              <Image source={{ uri: pendingUri }} style={styles.previewImage} resizeMode="cover" />
            )}
            <TextInput
              style={styles.captionInput}
              placeholder="e.g. Bathroom renovation, New York"
              placeholderTextColor={COLORS.textMuted}
              value={caption} onChangeText={setCaption}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button title="Skip" variant="secondary" onPress={savePortfolioItem} style={{ flex: 1 }} />
              <Button title="Save" onPress={savePortfolioItem} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  profileCard: { alignItems: 'center', padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarWrapper: { marginBottom: SPACING.md, position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '900', color: '#fff' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.background },
  profileInfo: { alignItems: 'center', gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  profileName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.success + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.full },
  verifiedText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  businessName: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  roleTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  roleTagText: { fontSize: 12, fontWeight: '700' },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '18', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.primary + '33' },
  addBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  verifyCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  verifyCardActive: { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '08' },
  verifyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  verifyDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  bioCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  bioText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  emptyPortfolio: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', gap: SPACING.sm },
  emptyPortfolioTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptyPortfolioSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  portfolioItem: { width: '31%', aspectRatio: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', position: 'relative' },
  portfolioImage: { width: '100%', height: '100%' },
  portfolioCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  portfolioCaptionText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  addPortfolioTile: { width: '31%', aspectRatio: 1, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#000000BB', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  previewImage: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
  captionInput: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
});
