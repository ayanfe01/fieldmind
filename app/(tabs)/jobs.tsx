import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { getServiceCategoryLabel, SERVICE_CATEGORY_OPTIONS } from '../../lib/serviceCategories';
import { useAppStore } from '../../store/useAppStore';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { Job } from '../../lib/types';

const FILTERS = ['All', 'Today', 'This week', 'Flexible'] as const;

export default function JobsScreen() {
  const router = useRouter();
  const { user, jobs, addClient, addQuote, startConversation } = useAppStore();
  const themedAlert = useThemedAlert();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const openJobs = useMemo(() => {
    const search = query.trim().toLowerCase();
    return jobs
      .filter(job => job.ownerId && job.ownerId !== user?.id && job.status === 'scheduled' && !job.assignedProId)
      .filter(job => filter === 'All' || job.urgency === filter)
      .filter(job => {
        if (!search) return true;
        const label = getServiceCategoryLabel(job.category, job.customCategory).toLowerCase();
        return [job.title, job.description, job.address, label].some(value => value?.toLowerCase().includes(search));
      });
  }, [filter, jobs, query, user?.id]);

  const createClientFromJob = (job: Job) => {
    const clientId = job.ownerId || `customer-${job.id}`;
    addClient({
      id: clientId,
      name: 'Customer',
      phone: '',
      address: job.address,
      notes: `${getServiceCategoryLabel(job.category, job.customCategory)} request. ${job.budgetRange || 'Quote needed'}.`,
      createdAt: new Date().toISOString(),
    });
    return clientId;
  };

  const openConversation = (job: Job, quoteRequested: boolean) => {
    const draft = quoteRequested
      ? `Hi, I can send a quote for "${job.title}".`
      : `Hi, I saw your request for "${job.title}" and can help.`;
    const conversationId = startConversation({
      participantId: job.ownerId || `customer-${job.id}`,
      participantUserId: job.ownerId,
      participantName: 'Customer',
      participantRole: 'customer',
      jobId: job.id,
      subject: quoteRequested ? `Quote: ${job.title}` : job.title,
      quoteRequested,
    });
    if (conversationId) {
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId, draft } });
    }
  };

  const requestJob = (job: Job) => {
    const conversationId = startConversation({
      participantId: job.ownerId || `customer-${job.id}`,
      participantUserId: job.ownerId,
      participantName: 'Customer',
      participantRole: 'customer',
      jobId: job.id,
      subject: job.title,
      quoteRequested: true,
    });
    if (conversationId) {
      router.push({
        pathname: '/chat/[conversationId]',
        params: {
          conversationId,
          draft: `Hi, I saw your request for "${job.title}" and I can help. Would you like me to send a quote or discuss the details first?`,
        },
      });
    }
  };

  const createQuote = (job: Job) => {
    const clientId = createClientFromJob(job);
    const baseAmount = Number(job.budgetRange?.match(/\d+/)?.[0] || 0);
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
      notes: `${getServiceCategoryLabel(job.category, job.customCategory)} quote draft. ${job.budgetRange || ''}`,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const conversationId = startConversation({
      participantId: job.ownerId || `customer-${job.id}`,
      participantUserId: job.ownerId,
      participantName: 'Customer',
      participantRole: 'customer',
      jobId: job.id,
      subject: `Quote: ${job.title}`,
      quoteRequested: true,
    });
    themedAlert.show({
      title: 'Quote draft created',
      message: 'Review the message before sending it to the customer. The job is not yours until the customer accepts.',
      icon: 'file-document-edit-outline',
      actions: [
        {
          label: 'Review Message',
          icon: 'message-outline',
          onPress: () => router.push({
            pathname: '/chat/[conversationId]',
            params: {
              conversationId,
              draft: `Hi, I prepared a quote draft for "${job.title}". I can adjust the price after we confirm the details.`,
            },
          }),
        },
        { label: 'Open Quotes', icon: 'file-document-outline', onPress: () => router.push('/(tabs)/quotes') },
        { label: 'Close', variant: 'ghost' },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Open Jobs</Text>
        <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
          <MaterialCommunityIcons name="account-circle-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by service, title, or location"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map(item => (
          <TouchableOpacity key={item} style={[styles.filterChip, filter === item && styles.filterChipActive]} onPress={() => setFilter(item)}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
        {SERVICE_CATEGORY_OPTIONS.slice(0, 5).map(item => (
          <TouchableOpacity key={item.value} style={styles.filterChip} onPress={() => setQuery(item.label)}>
            <Text style={styles.filterText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {openJobs.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={42} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>No matching jobs</Text>
            <Text style={styles.emptyText}>Try a different filter or check back later.</Text>
          </View>
        ) : openJobs.map(job => (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getServiceCategoryLabel(job.category, job.customCategory)}</Text>
              </View>
              <Text style={styles.budget}>{job.budgetRange || 'Quote'}</Text>
            </View>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.description} numberOfLines={3}>{job.description}</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{job.address}</Text>
              <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{job.urgency || job.scheduledTime}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.primaryAction} onPress={() => requestJob(job)}>
                <Text style={styles.primaryActionText}>Request Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => createQuote(job)}>
                <Text style={styles.secondaryActionText}>Quote</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconAction} onPress={() => openConversation(job, false)}>
                <MaterialCommunityIcons name="message-text-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  profileButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  searchRow: { minHeight: 50, marginHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  filterScroll: { maxHeight: 50, marginTop: SPACING.md },
  filters: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '800' },
  filterTextActive: { color: '#071210' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: 120, gap: SPACING.md },
  card: { gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  badge: { maxWidth: '66%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary + '16' },
  badgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '900' },
  budget: { fontSize: 13, color: COLORS.text, fontWeight: '900' },
  jobTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  description: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  metaText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', marginRight: SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  primaryAction: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  primaryActionText: { color: '#071210', fontWeight: '900' },
  secondaryAction: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.primary + '44' },
  secondaryActionText: { color: COLORS.primary, fontWeight: '900' },
  iconAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  empty: { alignItems: 'center', paddingVertical: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  emptyText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },
});
