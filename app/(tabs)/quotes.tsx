import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { QuoteStatus } from '../../lib/types';

const FILTERS: { label: string; value: QuoteStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
];

export default function QuotesScreen() {
  const router = useRouter();
  const { quotes, clients, updateQuote, deleteQuote } = useAppStore();
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const getClient = (id: string) => clients.find(c => c.id === id);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Quotes</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(tabs)/voice')}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyKicker}>Quotes</Text>
              <Text style={styles.emptyText}>No quotes yet</Text>
              <Text style={styles.emptySubtext}>Tap + New to create your first quote</Text>
            </View>
          )}
          {filtered.map(quote => {
            const client = getClient(quote.clientId);
            return (
              <View key={quote.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.clientName}>{client?.name || 'Unknown Client'}</Text>
                    <Text style={styles.jobDesc} numberOfLines={2}>{quote.jobDescription}</Text>
                    <Text style={styles.date}>Created {format(new Date(quote.createdAt), 'MMM d, yyyy')}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>${quote.total.toFixed(2)}</Text>
                    <StatusBadge status={quote.status} />
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {quote.status === 'draft' && (
                    <TouchableOpacity style={styles.actionChip} onPress={() => updateQuote(quote.id, { status: 'sent' })}>
                      <Text style={styles.actionChipText}>Mark Sent</Text>
                    </TouchableOpacity>
                  )}
                  {quote.status === 'sent' && (
                    <>
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => updateQuote(quote.id, { status: 'accepted' })}>
                        <Text style={[styles.actionChipText, { color: COLORS.success }]}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionChip, styles.actionRed]} onPress={() => updateQuote(quote.id, { status: 'declined' })}>
                        <Text style={[styles.actionChipText, { color: COLORS.error }]}>Decline</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={styles.actionChip} onPress={() => Alert.alert('Delete', 'Delete this quote?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteQuote(quote.id) },
                  ])}>
                    <Text style={styles.actionChipText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  newBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterScroll: { maxHeight: 48 },
  filters: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: SPACING.sm },
  clientName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  jobDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
  date: { fontSize: 11, color: COLORS.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  actionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  actionGreen: { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '11' },
  actionRed: { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '11' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyKicker: { fontSize: 16, fontWeight: '800', color: COLORS.textMuted, marginBottom: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
});
