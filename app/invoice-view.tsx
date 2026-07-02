import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { formatCurrency, getDeviceCurrency } from '../lib/payments';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';

/**
 * Read-only invoice/quote view for customers.
 * Params:
 *   invoiceId — show an invoice (with pay button if unpaid)
 *   quoteId   — show a quote (with Accept/Decline if still pending)
 */
export default function InvoiceViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invoiceId?: string; quoteId?: string; type?: 'deposit' | 'final' }>();
  const { invoices, quotes, clients, jobs, ratings, user } = useAppStore();
  const currency = useMemo(() => getDeviceCurrency(), []);

  const invoice = params.invoiceId ? invoices.find(i => i.id === params.invoiceId) : undefined;
  const quote = params.quoteId ? quotes.find(q => q.id === params.quoteId) : undefined;
  const record = invoice || quote;

  if (!record) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="receipt-text-remove-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.notFoundTitle}>Not found</Text>
          <Text style={styles.notFoundSub}>This document is no longer available.</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: SPACING.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  const client = clients.find(c => c.id === record.clientId);

  // Pro name comes from the conversation context or business name. Fall back to "Your Pro".
  const isInvoice = !!invoice;
  const isFullyPaid = invoice?.paymentStatus === 'fully_paid' || invoice?.status === 'paid';
  const isDepositPaid = invoice?.paymentStatus === 'deposit_paid';
  const canPay = isInvoice && !isFullyPaid && user?.role === 'customer';

  // Rate button: show for customers on fully-paid invoices where a pro was assigned
  const linkedJob = invoice ? jobs.find(j => j.invoiceId === invoice.id || (invoice.quoteId && j.quoteId === invoice.quoteId)) : undefined;
  const proId = linkedJob?.assignedProId;
  const proName = linkedJob?.assignedProName;
  const alreadyRated = !!proId && ratings.some(r => r.ratedUserId === proId && r.raterId === user?.id);
  const canRate = isFullyPaid && user?.role === 'customer' && !!proId && !alreadyRated;
  const payType = isDepositPaid ? 'final' : (params.type || 'deposit');

  const depositAmount = invoice?.depositAmount;
  const finalAmount = invoice?.finalAmount;
  const hasDeposit = !!depositAmount && depositAmount > 0 && depositAmount < (invoice?.total || 0);

  const payAmount = isDepositPaid
    ? (finalAmount || record.total)
    : (depositAmount || record.total);

  const statusLabel = isFullyPaid ? 'Paid in Full'
    : isDepositPaid ? 'Deposit Paid'
    : invoice?.status === 'overdue' ? 'Overdue'
    : invoice?.status === 'sent' ? 'Awaiting Payment'
    : quote?.status === 'accepted' ? 'Accepted'
    : quote?.status === 'declined' ? 'Declined'
    : 'Draft';

  const statusColor = isFullyPaid || quote?.status === 'accepted' ? COLORS.success
    : invoice?.status === 'overdue' || quote?.status === 'declined' ? COLORS.error
    : COLORS.warning;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isInvoice ? 'Invoice' : 'Quote'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top section: status + amounts */}
        <View style={styles.heroCard}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '44' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <Text style={styles.heroAmount}>{formatCurrency(record.total, currency)}</Text>
          <Text style={styles.heroDesc} numberOfLines={2}>{record.jobDescription}</Text>

          {isInvoice && invoice?.dueDate && (
            <Text style={styles.heroMeta}>
              Due: {format(new Date(invoice.dueDate), 'MMMM d, yyyy')}
            </Text>
          )}
          {!isInvoice && quote && (
            <Text style={styles.heroMeta}>
              Valid until: {format(new Date(quote.validUntil), 'MMMM d, yyyy')}
            </Text>
          )}
        </View>

        {/* Payment breakdown */}
        {isInvoice && hasDeposit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            <View style={styles.card}>
              <View style={styles.scheduleRow}>
                <View style={[styles.scheduleIcon, { backgroundColor: (isDepositPaid || isFullyPaid ? COLORS.success : COLORS.warning) + '18' }]}>
                  <MaterialCommunityIcons
                    name={isDepositPaid || isFullyPaid ? 'check-circle' : 'clock-outline'}
                    size={18}
                    color={isDepositPaid || isFullyPaid ? COLORS.success : COLORS.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleLabel}>Deposit</Text>
                  {invoice?.depositPaidAt && (
                    <Text style={styles.scheduleDate}>Paid {format(new Date(invoice.depositPaidAt), 'MMM d, yyyy')}</Text>
                  )}
                </View>
                <Text style={[styles.scheduleAmount, { color: isDepositPaid || isFullyPaid ? COLORS.success : COLORS.text }]}>
                  {formatCurrency(depositAmount!, currency)}
                </Text>
              </View>

              <View style={[styles.scheduleRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm, paddingTop: SPACING.sm }]}>
                <View style={[styles.scheduleIcon, { backgroundColor: (isFullyPaid ? COLORS.success : COLORS.textMuted) + '18' }]}>
                  <MaterialCommunityIcons
                    name={isFullyPaid ? 'check-circle' : 'circle-outline'}
                    size={18}
                    color={isFullyPaid ? COLORS.success : COLORS.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleLabel}>On Completion</Text>
                  {invoice?.paidAt && (
                    <Text style={styles.scheduleDate}>Paid {format(new Date(invoice.paidAt), 'MMM d, yyyy')}</Text>
                  )}
                </View>
                <Text style={[styles.scheduleAmount, { color: isFullyPaid ? COLORS.success : COLORS.text }]}>
                  {formatCurrency(finalAmount || 0, currency)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Line items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.card}>
            {record.lineItems.map((item, i) => (
              <View key={item.id} style={[styles.lineItem, i > 0 && styles.lineItemBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemDesc}>{item.description}</Text>
                  {item.quantity > 1 && (
                    <Text style={styles.lineItemQty}>{item.quantity} × {formatCurrency(item.unitPrice, currency)}</Text>
                  )}
                </View>
                <Text style={styles.lineItemTotal}>{formatCurrency(item.total, currency)}</Text>
              </View>
            ))}

            <View style={styles.totalsSection}>
              {record.subtotal !== record.total && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(record.subtotal, currency)}</Text>
                </View>
              )}
              {record.tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>{formatCurrency(record.tax, currency)}</Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(record.total, currency)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        {record.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{record.notes}</Text>
            </View>
          </View>
        )}

        {/* Client info (visible to pro if viewing their own invoice) */}
        {client && user?.role === 'tradesperson' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.card}>
              <View style={styles.clientRow}>
                <MaterialCommunityIcons name="account-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.clientText}>{client.name}</Text>
              </View>
              {client.phone && (
                <View style={styles.clientRow}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color={COLORS.textMuted} />
                  <Text style={styles.clientText}>{client.phone}</Text>
                </View>
              )}
              {client.address && (
                <View style={styles.clientRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.textMuted} />
                  <Text style={styles.clientText}>{client.address}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Powered by */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="shield-check-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.footerText}>Secure payments powered by Stripe</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky pay button for customers */}
      {canPay && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyInfo}>
            <Text style={styles.stickyLabel}>{isDepositPaid ? 'Final payment' : 'Due now'}</Text>
            <Text style={styles.stickyAmount}>{formatCurrency(payAmount, currency)}</Text>
          </View>
          <Button
            title={isDepositPaid ? 'Pay Final Balance' : 'Pay Now'}
            onPress={() => router.push({ pathname: '/payment', params: { invoiceId: invoice!.id, type: payType } })}
            style={styles.stickyBtn}
          />
        </View>
      )}
      {/* Rate button for customers on fully-paid invoices */}
      {canRate && (
        <View style={styles.stickyBar}>
          <View style={styles.stickyInfo}>
            <Text style={styles.stickyLabel}>Payment complete</Text>
            <Text style={[styles.stickyAmount, { fontSize: 15 }]}>How was the service?</Text>
          </View>
          <Button
            title={`Rate ${proName || 'Pro'}`}
            onPress={() => router.push({ pathname: '/rate-job', params: { jobId: linkedJob!.id, proId: proId!, proName: proName || 'Pro', invoiceId: invoice!.id } })}
            style={[styles.stickyBtn, { backgroundColor: '#F59E0B' }]}
          />
        </View>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  notFoundSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  heroCard: {
    margin: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  heroAmount: { fontSize: 40, fontWeight: '900', color: COLORS.text },
  heroDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  heroMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  scheduleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scheduleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  scheduleDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  scheduleAmount: { fontSize: 16, fontWeight: '800' },
  lineItem: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: SPACING.sm },
  lineItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  lineItemDesc: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  lineItemQty: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  lineItemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalsSection: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  grandTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  grandTotalValue: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  notesText: { fontSize: 14, color: COLORS.textSecondary, padding: SPACING.md, lineHeight: 22 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  clientText: { fontSize: 14, color: COLORS.text },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.lg },
  footerText: { fontSize: 11, color: COLORS.textMuted },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    padding: SPACING.lg, paddingBottom: 32,
  },
  stickyInfo: { flex: 1 },
  stickyLabel: { fontSize: 12, color: COLORS.textSecondary },
  stickyAmount: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  stickyBtn: { minWidth: 140 },
});
