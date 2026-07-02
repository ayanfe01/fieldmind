import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';

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
  const { user, isAuthenticated, setActiveRole, addClient, addQuote, startConversation } = useAppStore();
  const themedAlert = useThemedAlert();
  const params = useLocalSearchParams<{ jobId?: keyof typeof JOBS }>();
  const job = JOBS[params.jobId || 'sink'] || JOBS.sink;
  const jobId = params.jobId || 'sink';
  const nextRoute = `/job-preview?jobId=${jobId}`;

  const createLeadClient = () => {
    const clientId = `lead-${jobId}`;
    addClient({
      id: clientId,
      name: job.customer,
      phone: '',
      address: job.location,
      notes: `${job.category} lead. Budget: ${job.budget}.`,
      createdAt: new Date().toISOString(),
    });
    return clientId;
  };

  const openLeadConversation = (quoteRequested: boolean) => {
    const conversationId = startConversation({
      participantId: `customer-${jobId}`,
      participantName: job.customer,
      participantRole: 'customer',
      subject: quoteRequested ? `Quote: ${job.title}` : job.title,
      quoteRequested,
    });
    return conversationId;
  };

  const performRequestJob = () => {
    createLeadClient();
    const conversationId = openLeadConversation(true);
    router.push({
      pathname: '/chat/[conversationId]',
      params: {
        conversationId,
        draft: `Hi ${job.customer}, I saw your request for "${job.title}" and I can help. Would you like me to send a quote or discuss the details first?`,
      },
    });
  };

  const requestJob = () => {
    if (isAuthenticated && user?.role === 'tradesperson') {
      performRequestJob();
      return;
    }
    if (isAuthenticated) {
      if (user?.roles?.includes('tradesperson')) {
        themedAlert.show({
          title: 'Switch to service pro mode?',
          message: 'Requesting work is a service pro action. Switch modes and continue?',
          icon: 'briefcase-outline',
          actions: [
          {
            label: 'Switch',
            icon: 'swap-horizontal',
            onPress: async () => {
              await setActiveRole('tradesperson');
              performRequestJob();
            },
          },
          { label: 'Cancel', variant: 'ghost' },
          ],
        });
        return;
      }
      themedAlert.show({
        title: 'Service pro account required',
        message: 'Requesting jobs and sending quotes are provider actions. Create a service pro profile to use these tools.',
        icon: 'briefcase-plus-outline',
        actions: [
          { label: 'Create Pro Profile', icon: 'account-plus-outline', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson', next: nextRoute } }) },
          { label: 'Continue as Customer', variant: 'ghost' },
        ],
      });
      return;
    }
    themedAlert.show({
      title: 'Service pro account required',
      message: 'Create an account or log in to request this job, message the customer, or send a quote.',
      icon: 'lock-check-outline',
      actions: [
        { label: 'Log in', icon: 'login', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } }) },
        { label: 'Sign up', icon: 'account-plus-outline', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson', next: nextRoute } }) },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
  };

  const createQuoteDraft = () => {
    const clientId = createLeadClient();
    const baseAmount = Number(job.budget.match(/\d+/)?.[0] || 0);
    addQuote({
      id: '',
      clientId,
      jobDescription: job.description,
      lineItems: [{
        id: '1',
        description: job.title,
        quantity: 1,
        unitPrice: baseAmount,
        total: baseAmount,
      }],
      subtotal: baseAmount,
      tax: 0,
      total: baseAmount,
      status: 'draft',
      notes: `${job.category} quote draft from marketplace lead. Budget: ${job.budget}.`,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const conversationId = openLeadConversation(true);
    themedAlert.show({
      title: 'Quote draft created',
      message: 'Review the message before sending it. The job is not yours until the customer accepts.',
      icon: 'file-document-edit-outline',
      actions: [
        {
          label: 'Review Message',
          icon: 'message-outline',
          onPress: () => router.push({
            pathname: '/chat/[conversationId]',
            params: {
              conversationId,
              draft: `Hi ${job.customer}, I prepared a quote draft for "${job.title}". I can adjust the price after we confirm the details.`,
            },
          }),
        },
        { label: 'Open Quotes', icon: 'file-document-outline', onPress: () => router.replace('/(tabs)/quotes') },
        { label: 'Stay here', variant: 'ghost' },
      ],
    });
  };

  const sendQuote = () => {
    if (isAuthenticated && user?.role === 'tradesperson') {
      createQuoteDraft();
      return;
    }
    if (isAuthenticated && user?.roles?.includes('tradesperson')) {
      themedAlert.show({
        title: 'Switch to service pro mode?',
        message: 'Sending quotes is a service pro action. Switch modes and continue?',
        icon: 'briefcase-outline',
        actions: [
          {
            label: 'Switch',
            icon: 'swap-horizontal',
            onPress: async () => {
              await setActiveRole('tradesperson');
              createQuoteDraft();
            },
          },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
      return;
    }
    themedAlert.show({
      title: 'Service pro account required',
      message: 'Create or use a service pro account to send quotes.',
      icon: 'briefcase-plus-outline',
      actions: [
        { label: 'Log in', icon: 'login', onPress: () => router.push({ pathname: '/(auth)/login', params: { next: nextRoute } }) },
        { label: 'Sign up', icon: 'account-plus-outline', onPress: () => router.push({ pathname: '/(auth)/signup', params: { role: 'tradesperson', next: nextRoute } }) },
        { label: 'Cancel', variant: 'ghost' },
      ],
    });
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
            Requesting a job starts a customer conversation first. The job should only move to your schedule after the customer accepts your quote or gives the work to you.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={requestJob}>
            <Text style={styles.primaryText}>{isAuthenticated ? 'Request Job' : 'Sign Up to Request'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={sendQuote}>
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
