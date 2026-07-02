import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';

const LABELS = ['Terrible', 'Poor', 'Good', 'Great', 'Excellent'];
const QUICK_REVIEWS = [
  'Great work, very professional!',
  'On time and did an excellent job.',
  'Would definitely hire again.',
  'Good communication throughout.',
  'High quality work at a fair price.',
];

export default function RateJobScreen() {
  const router = useRouter();
  const themedAlert = useThemedAlert();
  const params = useLocalSearchParams<{ jobId: string; proId: string; proName: string; invoiceId?: string }>();
  const { user, addRating } = useAppStore();

  const [stars, setStars] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const displayStars = hovered || stars;

  const handleSubmit = () => {
    if (stars === 0) {
      themedAlert.show({
        title: 'Select a rating',
        message: 'Tap a star to rate the service.',
        icon: 'star-outline',
      });
      return;
    }
    if (!user) return;

    addRating({
      id: '',
      jobId: params.jobId,
      invoiceId: params.invoiceId,
      raterId: user.id,
      raterName: user.name,
      ratedUserId: params.proId,
      stars,
      review: review.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <MaterialCommunityIcons name="star" size={48} color="#F59E0B" />
          </View>
          <Text style={styles.successTitle}>Thanks for your review!</Text>
          <Text style={styles.successSub}>
            Your feedback helps {params.proName} and other customers in the community.
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <MaterialCommunityIcons key={n} name="star" size={28} color={n <= stars ? '#F59E0B' : COLORS.border} />
            ))}
          </View>
          {review ? <Text style={styles.successReview}>"{review}"</Text> : null}
          <Button
            title="Done"
            onPress={() => router.replace('/job-history')}
            style={{ marginTop: SPACING.xl, minWidth: 200 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Pro</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Pro identity */}
          <View style={styles.proCard}>
            <View style={styles.proAvatar}>
              <Text style={styles.proAvatarText}>{params.proName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.proName}>{params.proName}</Text>
              <Text style={styles.proSub}>How was the service?</Text>
            </View>
          </View>

          {/* Star picker */}
          <View style={styles.starSection}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setStars(n)}
                  onPressIn={() => setHovered(n)}
                  onPressOut={() => setHovered(0)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <MaterialCommunityIcons
                    name={n <= displayStars ? 'star' : 'star-outline'}
                    size={44}
                    color={n <= displayStars ? '#F59E0B' : COLORS.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {displayStars > 0 && (
              <Text style={styles.starLabel}>{LABELS[displayStars - 1]}</Text>
            )}
          </View>

          {/* Quick review chips */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Quick review (optional)</Text>
            <View style={styles.quickChips}>
              {QUICK_REVIEWS.map(q => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickChip, review === q && styles.quickChipActive]}
                  onPress={() => setReview(prev => prev === q ? '' : q)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quickChipText, review === q && styles.quickChipTextActive]}>
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom review */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Write your own</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Describe your experience…"
              placeholderTextColor={COLORS.textMuted}
              value={review}
              onChangeText={setReview}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Button title="Submit Review" onPress={handleSubmit} />
            <Button title="Skip" variant="ghost" onPress={() => router.back()} style={{ marginTop: SPACING.sm }} />
          </View>

          <View style={{ height: SPACING.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  proCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    margin: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  proAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  proAvatarText: { fontSize: 22, fontWeight: '900', color: '#071210' },
  proName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  proSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  starSection: { alignItems: 'center', paddingVertical: SPACING.lg },
  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  starLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  quickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  quickChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '14' },
  quickChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  quickChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  reviewInput: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    color: COLORS.text, fontSize: 14, minHeight: 100,
  },
  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#F59E0B18', alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg, borderWidth: 2, borderColor: '#F59E0B44',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  successSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg, maxWidth: 280 },
  successReview: { fontSize: 14, fontStyle: 'italic', color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, maxWidth: 280 },
});
