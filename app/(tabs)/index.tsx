import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatCard } from '../../components/cards/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { Avatar } from '../../components/ui/Avatar';
import { formatCurrency, getDeviceCurrency } from '../../lib/payments';

export default function HomeScreen() {
  const router = useRouter();
  const { user, jobs, invoices, getDashboardStats, availableBalance, pendingBalance, profilePhoto } = useAppStore();
  const stats = getDashboardStats();
  const currency = useMemo(() => getDeviceCurrency(), []);
  const today = new Date().toISOString().split('T')[0];
  const ownJobs = jobs.filter(job => !job.ownerId || job.ownerId === user?.id);
  const openMarketplaceJobs = jobs.filter(job => job.ownerId && job.ownerId !== user?.id && job.status === 'scheduled').slice(0, 3);
  const todayJobs = ownJobs.filter(job => job.scheduledDate === today && (job.status === 'scheduled' || job.status === 'in_progress'));
  const recentInvoices = invoices.slice(0, 3);
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const pendingTotal = invoices.filter(invoice => invoice.status === 'sent').reduce((sum, invoice) => sum + invoice.total, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{greeting}</Text>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.business}>{user?.businessName}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/profile')}>
            <Avatar name={user?.name} uri={profilePhoto} size={52} />
          </TouchableOpacity>
        </View>

        {/* Wallet Balance Card */}
        <TouchableOpacity style={styles.walletCard} onPress={() => router.push('/wallet')} activeOpacity={0.85}>
          <View style={styles.walletLeft}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <Text style={styles.walletAmount}>{formatCurrency(availableBalance, currency)}</Text>
            <View style={styles.walletPending}>
              <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.warning} />
              <Text style={styles.walletPendingText}>{formatCurrency(pendingBalance, currency)} awaiting payment</Text>
            </View>
          </View>
          <View style={styles.walletRight}>
            <View style={styles.walletWithdrawBtn}>
              <MaterialCommunityIcons name="bank-transfer-out" size={18} color={COLORS.background} />
              <Text style={styles.walletWithdrawText}>Withdraw</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Month</Text>
            <Text style={styles.sectionMeta}>{format(new Date(), 'MMM yyyy')}</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Earned" value={`$${stats.totalEarningsMonth.toLocaleString()}`} icon="cash-multiple" color={COLORS.success} trend="+12% vs last month" />
            <StatCard label="Pending" value={`$${pendingTotal.toLocaleString()}`} icon="clock-outline" color={COLORS.warning} />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Active Jobs" value={String(stats.scheduledJobs)} icon="briefcase-check-outline" color={COLORS.primary} />
            <StatCard label="Open Quotes" value={String(stats.activeQuotes)} icon="file-document-outline" color="#7EA7D8" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/schedule')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {todayJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-check-outline" size={30} color={COLORS.primary} />
              <Text style={styles.emptyText}>No jobs scheduled today</Text>
            </View>
          ) : todayJobs.map(job => (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobTime}>
                <Text style={styles.jobTimeText}>{job.scheduledTime}</Text>
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.jobAddress}>{job.address}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="timer-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.jobDuration}>~{job.estimatedHours}h</Text>
                </View>
              </View>
              <StatusBadge status={job.status} />
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Open Customer Jobs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
              <Text style={styles.seeAll}>Browse</Text>
            </TouchableOpacity>
          </View>
          {openMarketplaceJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={30} color={COLORS.primary} />
              <Text style={styles.emptyText}>No open jobs yet</Text>
            </View>
          ) : openMarketplaceJobs.map(job => (
            <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => router.push('/(tabs)/jobs')} activeOpacity={0.85}>
              <View style={styles.jobTime}>
                <Text style={styles.jobTimeText}>{job.budgetRange || 'Quote'}</Text>
              </View>
              <View style={styles.jobInfo}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="briefcase-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.jobAddress}>{job.customCategory || job.category || 'Service request'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentInvoices.map(invoice => (
            <TouchableOpacity key={invoice.id} style={styles.invoiceCard} onPress={() => router.push({ pathname: '/invoice-view', params: { invoiceId: invoice.id } })} activeOpacity={0.85}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceDesc} numberOfLines={1}>{invoice.jobDescription}</Text>
                <Text style={styles.invoiceDate}>{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total, currency)}</Text>
                <StatusBadge status={invoice.status} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton icon="file-document-plus-outline" label="AI Quote" onPress={() => router.push('/(tabs)/voice')} />
            <ActionButton icon="send-outline" label="Send Invoice" onPress={() => router.push('/(tabs)/invoices')} />
            <ActionButton icon="calendar-plus" label="Schedule Job" onPress={() => router.push('/(tabs)/schedule')} />
            <ActionButton icon="message-text-outline" label="Messages" onPress={() => router.push('/(tabs)/messages')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', paddingBottom: 110 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.screenTop,
    paddingBottom: SPACING.xl,
  },
  headerCopy: { gap: 3 },
  eyebrow: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase' },
  name: { fontSize: 30, fontWeight: '800', color: COLORS.text },
  business: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '700' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sectionMeta: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  seeAll: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobTime: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  jobTimeText: { fontSize: 13, fontWeight: '800', color: COLORS.primaryLight },
  jobInfo: { flex: 1, gap: 3 },
  jobTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobAddress: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  jobDuration: { fontSize: 12, color: COLORS.textMuted },
  invoiceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceInfo: { flex: 1, marginRight: SPACING.md },
  invoiceDesc: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  invoiceDate: { fontSize: 12, color: COLORS.textMuted },
  invoiceRight: { alignItems: 'flex-end', gap: 8 },
  invoiceAmount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  walletCard: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  walletLeft: { gap: 4 },
  walletLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  walletAmount: { fontSize: 30, fontWeight: '900', color: '#fff' },
  walletPending: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  walletPendingText: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  walletRight: {},
  walletWithdrawBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
  },
  walletWithdrawText: { fontSize: 13, fontWeight: '800', color: COLORS.background },
});
