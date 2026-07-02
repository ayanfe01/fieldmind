import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { formatCurrency, getDeviceCurrency } from '../lib/payments';
import { useAppStore } from '../store/useAppStore';

type Filter = 'all' | 'completed' | 'cancelled';

function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <MaterialCommunityIcons
          key={n}
          name={n <= stars ? 'star' : 'star-outline'}
          size={size}
          color={n <= stars ? '#F59E0B' : COLORS.textMuted}
        />
      ))}
    </View>
  );
}

export default function JobHistoryScreen() {
  const router = useRouter();
  const { user, jobs, invoices, ratings, clients } = useAppStore();
  const currency = useMemo(() => getDeviceCurrency(), []);
  const [filter, setFilter] = useState<Filter>('all');

  const isPro = user?.role === 'tradesperson';

  // Pro sees jobs they own or were assigned to; customer sees jobs they created
  const myJobs = useMemo(() => {
    const done = jobs.filter(j =>
      j.status === 'completed' || j.status === 'cancelled'
    );
    if (isPro) {
      return done.filter(j => !j.ownerId || j.ownerId === user?.id || j.assignedProId === user?.id);
    }
    return done.filter(j => j.clientId === user?.id || j.ownerId === user?.id);
  }, [jobs, user, isPro]);

  const filtered = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter);
  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.completedAt || a.createdAt;
    const dateB = b.completedAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const getClient = (id: string) => clients.find(c => c.id === id);

  const getRatingForJob = (jobId: string) =>
    ratings.find(r => r.jobId === jobId && (isPro ? r.ratedUserId === user?.id : r.raterId === user?.id));

  const getInvoiceForJob = (job: typeof jobs[number]) =>
    invoices.find(inv => inv.id === job.invoiceId || (job.quoteId && inv.quoteId === job.quoteId));

  const FILTERS: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{myJobs.filter(j => j.status === 'completed').length}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNum}>{myJobs.filter(j => j.status === 'cancelled').length}</Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
        {isPro && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>
              {ratings.filter(r => r.ratedUserId === user?.id).length > 0
                ? (ratings.filter(r => r.ratedUserId === user?.id).reduce((s, r) => s + r.stars, 0) /
                    ratings.filter(r => r.ratedUserId === user?.id).length).toFixed(1)
                : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Avg rating</Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {sorted.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="briefcase-clock-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No job history yet</Text>
              <Text style={styles.emptySub}>
                {isPro ? 'Completed jobs will show up here.' : 'Jobs you book will appear here once completed.'}
              </Text>
            </View>
          ) : sorted.map(job => {
            const client = getClient(job.clientId);
            const invoice = getInvoiceForJob(job);
            const rating = getRatingForJob(job.id);
            const isCompleted = job.status === 'completed';
            const isPaid = invoice?.paymentStatus === 'fully_paid' || invoice?.status === 'paid';
            const canRate = !isPro && isCompleted && job.assignedProId && !rating;

            return (
              <TouchableOpacity
                key={job.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/job-detail', params: { jobId: job.id } })}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusDot, { backgroundColor: isCompleted ? COLORS.success : COLORS.error }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    {(client || job.assignedProName) && (
                      <Text style={styles.jobMeta}>
                        {isPro ? (client?.name || 'Customer') : (job.assignedProName || 'Pro')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    {invoice && (
                      <Text style={[styles.amount, { color: isPaid ? COLORS.success : COLORS.textSecondary }]}>
                        {formatCurrency(invoice.total, currency)}
                      </Text>
                    )}
                    <Text style={[styles.statusLabel, { color: isCompleted ? COLORS.success : COLORS.error }]}>
                      {isCompleted ? 'Completed' : 'Cancelled'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardMeta}>
                  <MaterialCommunityIcons name="calendar-outline" size={13} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>
                    {format(new Date(job.completedAt || job.scheduledDate), 'MMM d, yyyy')}
                  </Text>
                  {job.address ? (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <MaterialCommunityIcons name="map-marker-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText} numberOfLines={1}>{job.address}</Text>
                    </>
                  ) : null}
                </View>

                {/* Rating display */}
                {rating && (
                  <View style={styles.ratingRow}>
                    <StarRow stars={rating.stars} />
                    {rating.review ? <Text style={styles.ratingReview} numberOfLines={1}>"{rating.review}"</Text> : null}
                  </View>
                )}

                {/* Action row */}
                <View style={styles.cardActions}>
                  {invoice && (
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({ pathname: '/invoice-view', params: { invoiceId: invoice.id } });
                      }}
                    >
                      <MaterialCommunityIcons name="receipt-text-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.actionText}>View Invoice</Text>
                    </TouchableOpacity>
                  )}
                  {canRate && (
                    <TouchableOpacity
                      style={[styles.actionChip, styles.actionPrimary]}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: '/rate-job',
                          params: {
                            jobId: job.id,
                            proId: job.assignedProId!,
                            proName: job.assignedProName || 'Your Pro',
                            invoiceId: invoice?.id,
                          },
                        });
                      }}
                    >
                      <MaterialCommunityIcons name="star-outline" size={13} color={COLORS.primary} />
                      <Text style={[styles.actionText, { color: COLORS.primary }]}>Rate</Text>
                    </TouchableOpacity>
                  )}
                  {isPro && rating && (
                    <View style={styles.ratingChip}>
                      <MaterialCommunityIcons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingChipText}>{rating.stars}/5 from {rating.raterName}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.lg, paddingBottom: SPACING.sm },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryNum: { fontSize: 24, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  filterScroll: { maxHeight: 48 },
  filters: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#071210' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  empty: { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  jobMeta: { fontSize: 12, color: COLORS.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: '800' },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm },
  metaText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  metaDot: { fontSize: 12, color: COLORS.textMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  ratingReview: { fontSize: 12, color: COLORS.textSecondary, flex: 1, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  actionPrimary: { borderColor: COLORS.primary + '44', backgroundColor: COLORS.primary + '11' },
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: '#F59E0B' + '18', borderWidth: 1, borderColor: '#F59E0B44' },
  ratingChipText: { fontSize: 12, fontWeight: '600', color: '#B45309' },
});
