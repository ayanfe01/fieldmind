import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

const CATEGORIES = ['Plumbing', 'Electrical', 'Hair', 'Tailoring', 'Shoes', 'Cleaning', 'Auto', 'Repairs', 'Roofing', 'Carpentry'];
const URGENCY = ['Today', 'This week', 'Flexible'];
const BUDGETS = ['$100-$250', '$250-$500', '$500-$1k', '$1k+'];

export default function PostJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { user, isAuthenticated, authInitialized, addJob } = useAppStore();
  const [category, setCategory] = useState(params.category || 'Plumbing');
  const [urgency, setUrgency] = useState('This week');
  const [budget, setBudget] = useState('$250-$500');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [address, setAddress] = useState('');
  const nextRoute = '/post-job';

  const completion = useMemo(() => {
    const fields = [category, urgency, budget, title, details, address];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [address, budget, category, details, title, urgency]);

  const submitRequest = () => {
    if (!title || !details || !address) {
      Alert.alert('A little more detail', 'Add a title, request details, and location so pros can quote accurately.');
      return;
    }
    if (!authInitialized) return;
    if (isAuthenticated && user?.role === 'customer') {
      addJob({
        id: '',
        clientId: user.id,
        title,
        description: details,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: urgency === 'Today' ? 'ASAP' : 'Flexible',
        estimatedHours: 1,
        status: 'scheduled',
        address,
        notes: `${category} request. Budget: ${budget}. Timing: ${urgency}.`,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Request posted', 'Your request is live. Pros can now review it and send quotes.');
      router.replace('/customer-home');
      return;
    }
    if (isAuthenticated) {
      Alert.alert('Customer account needed', 'Switch to a customer account to request quotes from service pros.');
      return;
    }
    router.push({ pathname: '/(auth)/signup', params: { role: 'customer', next: nextRoute } });
  };

  if (!authInitialized) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post a Job</Text>
        {isAuthenticated ? (
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/profile')}>
            <Text style={styles.loginText}>Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } })}>
            <Text style={styles.loginText}>Log in</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.progressPanel}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Job draft</Text>
            <Text style={styles.progressValue}>{completion}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.progressHint}>{isAuthenticated ? 'Create the request now and pros can send quotes.' : 'Create the request now. You will sign up before it goes live.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Service category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, category === item && styles.chipActive]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Job title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Kitchen sink is leaking"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What is happening?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue, timing, access notes, and anything the pro should know."
            placeholderTextColor={COLORS.textMuted}
            value={details}
            onChangeText={setDetails}
            multiline
          />
        </View>

        <TouchableOpacity style={styles.photoBox} activeOpacity={0.85}>
          <MaterialCommunityIcons name="camera-plus-outline" size={26} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.photoTitle}>Add photos after signup</Text>
            <Text style={styles.photoBody}>Photos help service pros quote faster and more accurately.</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.label}>When do you need it?</Text>
          <View style={styles.optionGrid}>
            {URGENCY.map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.option, urgency === item && styles.optionActive]}
                onPress={() => setUrgency(item)}
              >
                <Text style={[styles.optionText, urgency === item && styles.optionTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Budget range</Text>
          <View style={styles.optionGrid}>
            {BUDGETS.map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.option, budget === item && styles.optionActive]}
                onPress={() => setBudget(item)}
              >
                <Text style={[styles.optionText, budget === item && styles.optionTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Street, city, or service area"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Service pro preview</Text>
          <Text style={styles.previewJob}>{title || 'Your job title will appear here'}</Text>
          <Text style={styles.previewMeta}>{category} · {urgency} · {budget}</Text>
          <Text style={styles.previewBody} numberOfLines={3}>
            {details || 'Add a clear description so nearby pros know whether the job is a good fit.'}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={submitRequest}>
          <Text style={styles.primaryText}>{isAuthenticated ? 'Post Request' : 'Create Account to Post'}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  loginButton: { minWidth: 58, alignItems: 'flex-end' },
  loginText: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: 140, gap: SPACING.lg },
  progressPanel: { gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  progressValue: { fontSize: 13, color: COLORS.primary, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceLight, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  progressHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  section: { gap: SPACING.sm },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  chipRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  chipTextActive: { color: '#071210' },
  field: { gap: SPACING.sm },
  input: { minHeight: 52, paddingHorizontal: SPACING.md, color: COLORS.text, fontSize: 15, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 118, paddingTop: SPACING.md, textAlignVertical: 'top' },
  photoBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.primary + '10', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '34' },
  photoTitle: { fontSize: 14, color: COLORS.text, fontWeight: '900', marginBottom: 3 },
  photoBody: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  option: { minWidth: '30%', flexGrow: 1, paddingVertical: 12, alignItems: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  optionActive: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  optionText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800' },
  optionTextActive: { color: COLORS.primary },
  previewCard: { gap: 6, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  previewTitle: { fontSize: 12, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase' },
  previewJob: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  previewMeta: { fontSize: 13, color: COLORS.primary, fontWeight: '800' },
  previewBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md },
  primaryText: { fontSize: 15, color: '#071210', fontWeight: '900' },
});
