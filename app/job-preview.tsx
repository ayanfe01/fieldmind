import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';

const JOBS = {
  sink: {
    title: 'Kitchen sink leaking',
    category: 'Plumbing',
    location: 'Moncton, NB',
    budget: '$300-$450',
    urgency: 'Today',
    customer: 'M. Johnson',
    description: 'Water is leaking under the kitchen sink near the trap. Customer wants inspection, repair, and a clean estimate before work starts.',
    details: ['Photos available after signup', 'Customer prefers afternoon', 'Parking available', 'Quote required first'],
  },
  outlet: {
    title: 'Install outdoor outlet',
    category: 'Electrical',
    location: 'Dieppe, NB',
    budget: '$350-$500',
    urgency: 'Ready today',
    customer: 'Sarah W.',
    description: 'Install a weather-rated outdoor outlet near the back patio. Customer wants materials and labor included in quote.',
    details: ['Exterior wall access', 'Customer has photos', 'Flexible timing', 'Licensed electrician preferred'],
  },
  fan: {
    title: 'Ceiling fan replacement',
    category: 'Repairs',
    location: 'Riverview, NB',
    budget: '$150-$240',
    urgency: 'Flexible',
    customer: 'Tom D.',
    description: 'Remove old ceiling fan and install replacement unit in bedroom. Existing wiring is already in place.',
    details: ['Replacement fan purchased', 'Indoor job', 'Weekday preferred', 'Invoice needed'],
  },
} as const;

export default function JobPreviewScreen() {
  const router = useRouter();
  const { user, isAuthenticated, addClient, addJob } = useAppStore();
  const params = useLocalSearchParams<{ jobId?: keyof typeof JOBS }>();
  const job = JOBS[params.jobId || 'sink'] || JOBS.sink;
  const jobId = params.jobId || 'sink';
  const nextRoute = `/job-preview?jobId=${jobId}`;

  const lockedAction = () => {
    if (isAuthenticated && user?.role === 'tradesperson') {
      const clientId = `lead-${jobId}`;
      addClient({
        id: clientId,
        name: job.customer,
        phone: '',
        address: job.location,
        notes: `${job.category} lead. Budget: ${job.budget}.`,
        createdAt: new Date().toISOString(),
      });
      addJob({
        id: '',
        clientId,
        title: job.title,
        description: job.description,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: job.urgency === 'Today' || job.urgency === 'Ready today' ? 'ASAP' : 'Flexible',
        estimatedHours: 1,
        status: 'scheduled',
        address: job.location,
        notes: `${job.category} lead accepted. Budget: ${job.budget}.`,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Job added', 'This request was added to your schedule. Send the customer a quote from your quotes tab.');
      router.replace('/(tabs)/schedule');
      return;
    }
    if (isAuthenticated) {
      Alert.alert('Service pro account required', 'Accepting jobs and sending quotes are provider actions. Create a service pro profile to use these tools.', [
        { text: 'Create Pro Profile', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson', next: nextRoute } }) },
        { text: 'Continue as Customer', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Service pro account required', 'Create an account or log in to accept this job, message the customer, or send a quote.', [
      { text: 'Log in', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } }) },
      { text: 'Sign up', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson', next: nextRoute } }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Preview</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => isAuthenticated ? router.push('/profile') : router.push({ pathname: '/(auth)/login', params: { next: nextRoute } })}>
          <MaterialCommunityIcons name={isAuthenticated ? 'account-circle-outline' : 'login'} size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{job.category}</Text>
            </View>
            <Text style={styles.budget}>{job.budget}</Text>
          </View>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.description}>{job.description}</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.primary} />
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{job.location}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.warning} />
              <Text style={styles.metaLabel}>Timing</Text>
              <Text style={styles.metaValue}>{job.urgency}</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Customer</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{job.customer.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{job.customer}</Text>
              <Text style={styles.customerMeta}>Payment verified · New request</Text>
            </View>
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={COLORS.success} />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Job details</Text>
          {job.details.map(item => (
            <View key={item} style={styles.detailRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.detailText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Why this is locked</Text>
          <Text style={styles.lockCopy}>
            Accepting a job creates a real customer relationship. FieldMind requires an account so quotes, messages, invoices, and payments stay tied to the right service pro.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={lockedAction}>
            <Text style={styles.primaryText}>{isAuthenticated ? 'Accept Job' : 'Sign Up to Accept'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={lockedAction}>
            <Text style={styles.secondaryText}>Send Quote</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  hero: { gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary + '18' },
  categoryText: { fontSize: 12, color: COLORS.primary, fontWeight: '900' },
  budget: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  title: { fontSize: 25, lineHeight: 31, color: COLORS.text, fontWeight: '900' },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  metaGrid: { flexDirection: 'row', gap: SPACING.sm },
  metaItem: { flex: 1, gap: 4, padding: SPACING.md, backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '800', textTransform: 'uppercase' },
  metaValue: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
  panel: { gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  panelTitle: { fontSize: 16, color: COLORS.text, fontWeight: '900' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  avatarText: { fontSize: 17, color: '#071210', fontWeight: '900' },
  customerName: { fontSize: 15, color: COLORS.text, fontWeight: '900' },
  customerMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  detailText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  lockCopy: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  primaryButton: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  primaryText: { fontSize: 14, color: '#071210', fontWeight: '900' },
  secondaryButton: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary + '44' },
  secondaryText: { fontSize: 14, color: COLORS.primary, fontWeight: '900' },
});
