import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/payments';
import { InvoiceStatus } from '../../lib/types';

const FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
];

export default function InvoicesScreen() {
  const router = useRouter();
  const { invoices, clients, addClient, addInvoice, updateInvoice } = useAppStore();
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showNewModal, setShowNewModal] = useState(false);
  const [draft, setDraft] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    address: '',
    jobDescription: '',
    amount: '',
  });

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const getClient = (id: string) => clients.find(c => c.id === id);
  const totalPending = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const resetDraft = () => {
    setDraft({ clientName: '', clientPhone: '', clientEmail: '', address: '', jobDescription: '', amount: '' });
  };

  const createInvoice = () => {
    const amount = Number(draft.amount);
    if (!draft.clientName.trim() || !draft.jobDescription.trim() || !amount || amount <= 0) {
      Alert.alert('Missing details', 'Add the client name, job description, and invoice amount.');
      return;
    }

    const now = new Date().toISOString();
    const clientId = `client-${Date.now()}`;
    addClient({
      id: clientId,
      name: draft.clientName.trim(),
      phone: draft.clientPhone.trim(),
      email: draft.clientEmail.trim() || undefined,
      address: draft.address.trim() || 'Address not set',
      createdAt: now,
    });
    addInvoice({
      id: '',
      clientId,
      jobDescription: draft.jobDescription.trim(),
      lineItems: [{
        id: '1',
        description: draft.jobDescription.trim(),
        quantity: 1,
        unitPrice: amount,
        total: amount,
      }],
      subtotal: amount,
      tax: 0,
      total: amount,
      status: 'draft',
      dueDate: addDays(new Date(), 7).toISOString(),
      createdAt: now,
    });
    resetDraft();
    setShowNewModal(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewModal(true)}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.warning} />
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>{formatCurrency(totalPending)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: COLORS.success + '44' }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={COLORS.success} />
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(totalPaid)}</Text>
        </View>
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
              <MaterialCommunityIcons name="receipt-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No invoices</Text>
            </View>
          )}
          {filtered.map(invoice => {
            const client = getClient(invoice.clientId);
            const hasDepositPaid = invoice.paymentStatus === 'deposit_paid';
            const isFullyPaid = invoice.paymentStatus === 'fully_paid' || invoice.status === 'paid';
            const hasSplitTerms = invoice.paymentTerms === 'split_50_50' || invoice.paymentTerms === 'custom';

            return (
              <View key={invoice.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.clientName}>{client?.name || 'Unknown client'}</Text>
                    <Text style={styles.jobDesc} numberOfLines={1}>{invoice.jobDescription}</Text>
                    <Text style={styles.date}>Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>{formatCurrency(invoice.total)}</Text>
                    <StatusBadge status={invoice.status} />
                  </View>
                </View>

                {hasSplitTerms && invoice.depositAmount && (
                  <View style={styles.paymentProgress}>
                    <View style={styles.progressItem}>
                      <MaterialCommunityIcons name={hasDepositPaid || isFullyPaid ? 'check-circle' : 'circle-outline'} size={16} color={hasDepositPaid || isFullyPaid ? COLORS.success : COLORS.textMuted} />
                      <Text style={styles.progressLabel}>
                        Deposit {formatCurrency(invoice.depositAmount)}
                        {invoice.depositPaidAt ? ` - ${format(new Date(invoice.depositPaidAt), 'MMM d')}` : ''}
                      </Text>
                    </View>
                    <View style={styles.progressItem}>
                      <MaterialCommunityIcons name={isFullyPaid ? 'check-circle' : 'circle-outline'} size={16} color={isFullyPaid ? COLORS.success : COLORS.textMuted} />
                      <Text style={styles.progressLabel}>
                        Final {formatCurrency(invoice.finalAmount || 0)}
                        {invoice.paidAt ? ` - ${format(new Date(invoice.paidAt), 'MMM d')}` : ''}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.itemsRow}>
                  {invoice.lineItems.slice(0, 2).map(item => (
                    <Text key={item.id} style={styles.itemText}>- {item.description}: {formatCurrency(item.total)}</Text>
                  ))}
                  {invoice.lineItems.length > 2 && <Text style={styles.itemText}>+{invoice.lineItems.length - 2} more items</Text>}
                </View>

                <View style={styles.cardActions}>
                  {invoice.status !== 'paid' && !invoice.paymentTerms && (
                    <TouchableOpacity style={[styles.actionChip, styles.actionPrimary]} onPress={() => router.push({ pathname: '/payment', params: { invoiceId: invoice.id } })}>
                      <MaterialCommunityIcons name="cash-multiple" size={13} color={COLORS.primary} />
                      <Text style={[styles.actionChipText, { color: COLORS.primary }]}>Set Payment Terms</Text>
                    </TouchableOpacity>
                  )}
                  {invoice.paymentTerms && !hasDepositPaid && !isFullyPaid && invoice.depositAmount && invoice.depositAmount > 0 && (
                    <TouchableOpacity style={[styles.actionChip, styles.actionWarning]} onPress={() => router.push({ pathname: '/payment', params: { invoiceId: invoice.id, type: 'deposit' } })}>
                      <MaterialCommunityIcons name="cash-fast" size={13} color={COLORS.warning} />
                      <Text style={[styles.actionChipText, { color: COLORS.warning }]}>Collect Deposit</Text>
                    </TouchableOpacity>
                  )}
                  {hasDepositPaid && !isFullyPaid && (
                    <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => router.push({ pathname: '/payment', params: { invoiceId: invoice.id, type: 'final' } })}>
                      <MaterialCommunityIcons name="check-bold" size={13} color={COLORS.success} />
                      <Text style={[styles.actionChipText, { color: COLORS.success }]}>Collect Final</Text>
                    </TouchableOpacity>
                  )}
                  {(invoice.status === 'sent' || invoice.status === 'overdue') && !invoice.paymentTerms && (
                    <TouchableOpacity style={styles.actionChip} onPress={() => updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString(), paymentStatus: 'fully_paid' })}>
                      <Text style={styles.actionChipText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionChip} onPress={() => Alert.alert('Reminder queued', `Reminder ready for ${client?.name || 'this client'}.`)}>
                    <MaterialCommunityIcons name="message-text-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.actionChipText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <Modal visible={showNewModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>New Invoice</Text>
              <Text style={styles.inputLabel}>Client name</Text>
              <TextInput style={styles.input} placeholder="e.g. John Smith" placeholderTextColor={COLORS.textMuted} value={draft.clientName} onChangeText={text => setDraft(prev => ({ ...prev, clientName: text }))} />
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.input} placeholder="+1 555 000 0000" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={draft.clientPhone} onChangeText={text => setDraft(prev => ({ ...prev, clientPhone: text }))} />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput style={styles.input} placeholder="client@example.com" placeholderTextColor={COLORS.textMuted} keyboardType="email-address" autoCapitalize="none" value={draft.clientEmail} onChangeText={text => setDraft(prev => ({ ...prev, clientEmail: text }))} />
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput style={styles.input} placeholder="Job address" placeholderTextColor={COLORS.textMuted} value={draft.address} onChangeText={text => setDraft(prev => ({ ...prev, address: text }))} />
              <Text style={styles.inputLabel}>Job description</Text>
              <TextInput style={[styles.input, styles.textarea]} placeholder="Describe the work billed" placeholderTextColor={COLORS.textMuted} multiline value={draft.jobDescription} onChangeText={text => setDraft(prev => ({ ...prev, jobDescription: text }))} />
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput style={styles.input} placeholder="425" placeholderTextColor={COLORS.textMuted} keyboardType="decimal-pad" value={draft.amount} onChangeText={text => setDraft(prev => ({ ...prev, amount: text }))} />
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => { resetDraft(); setShowNewModal(false); }} style={{ flex: 1 }} />
                <Button title="Create" onPress={createInvoice} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.sm },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  newBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full },
  newBtnText: { color: '#071210', fontWeight: '900', fontSize: 14 },
  summaryRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  summaryCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  filterScroll: { maxHeight: 48 },
  filters: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#071210' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: SPACING.sm },
  clientName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  jobDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  date: { fontSize: 11, color: COLORS.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  paymentProgress: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  progressItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  itemsRow: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  itemText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  actionPrimary: { borderColor: COLORS.primary + '44', backgroundColor: COLORS.primary + '11' },
  actionGreen: { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '11' },
  actionWarning: { borderColor: COLORS.warning + '44', backgroundColor: COLORS.warning + '11' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: SPACING.lg },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});
