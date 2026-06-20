import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { PAYMENT_TERMS, calculatePaymentSplit, formatCurrency, createPaymentIntent, TEST_CARDS } from '../lib/payments';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';

type Step = 'terms' | 'summary' | 'processing' | 'success';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invoiceId: string; type: 'deposit' | 'final' }>();
  const { invoices, clients, updateInvoice } = useAppStore();

  const invoice = invoices.find(i => i.id === params.invoiceId);
  const client = clients.find(c => c.id === invoice?.clientId);

  const [step, setStep] = useState<Step>(params.type ? 'summary' : 'terms');
  const [selectedTerms, setSelectedTerms] = useState(PAYMENT_TERMS[0]);
  const [customPercent, setCustomPercent] = useState('30');
  const [processing, setProcessing] = useState(false);

  if (!invoice) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Invoice not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const split = calculatePaymentSplit(
    invoice.total,
    selectedTerms,
    selectedTerms.type === 'custom' ? parseInt(customPercent) : undefined
  );

  const isDepositPayment = params.type === 'deposit';
  const isFinalPayment = params.type === 'final';
  const paymentAmount = isDepositPayment ? split.depositAmount :
    isFinalPayment ? (invoice.finalAmount || split.finalAmount) :
    split.depositAmount;

  const handleConfirmTerms = () => {
    updateInvoice(invoice.id, {
      paymentTerms: selectedTerms.type,
      depositPercent: selectedTerms.type === 'custom' ? parseInt(customPercent) : selectedTerms.depositPercent,
      depositAmount: split.depositAmount,
      finalAmount: split.finalAmount,
      paymentStatus: 'unpaid',
    });
    setStep('summary');
  };

  const handlePay = async () => {
    setProcessing(true);
    setStep('processing');
    try {
      const amountInCents = Math.round(paymentAmount * 100);
      const description = isDepositPayment
        ? `Deposit for: ${invoice.jobDescription}`
        : isFinalPayment
        ? `Final payment for: ${invoice.jobDescription}`
        : `Payment for: ${invoice.jobDescription}`;

      await createPaymentIntent(amountInCents, 'usd', description, {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
        type: params.type || 'full',
      });

      // Simulate a short processing delay for UX
      await new Promise(r => setTimeout(r, 1500));

      // Update invoice status
      if (isDepositPayment) {
        updateInvoice(invoice.id, {
          depositPaidAt: new Date().toISOString(),
          paymentStatus: split.finalAmount > 0 ? 'deposit_paid' : 'fully_paid',
          status: split.finalAmount > 0 ? 'sent' : 'paid',
        });
      } else {
        updateInvoice(invoice.id, {
          paidAt: new Date().toISOString(),
          paymentStatus: 'fully_paid',
          status: 'paid',
        });
      }

      setStep('success');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Payment failed. Please try again.';
      Alert.alert('Payment Failed', message);
      setStep('summary');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'terms' ? 'Payment Terms' :
           step === 'summary' ? 'Payment Summary' :
           step === 'processing' ? 'Processing...' : 'Payment Complete'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* STEP 1 — Choose Terms */}
        {step === 'terms' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Choose payment terms for this invoice</Text>
            <View style={styles.invoiceSummaryCard}>
              <Text style={styles.clientName}>{client?.name}</Text>
              <Text style={styles.jobDesc} numberOfLines={2}>{invoice.jobDescription}</Text>
              <Text style={styles.totalLabel}>Invoice Total: <Text style={styles.totalAmount}>{formatCurrency(invoice.total)}</Text></Text>
            </View>

            {PAYMENT_TERMS.map(terms => (
              <TouchableOpacity
                key={terms.type}
                style={[styles.termsCard, selectedTerms.type === terms.type && styles.termsCardActive]}
                onPress={() => setSelectedTerms(terms)}
                activeOpacity={0.8}
              >
                <View style={styles.termsRow}>
                  <View style={[styles.radio, selectedTerms.type === terms.type && styles.radioActive]}>
                    {selectedTerms.type === terms.type && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.termsInfo}>
                    <Text style={[styles.termsLabel, selectedTerms.type === terms.type && { color: COLORS.primary }]}>
                      {terms.label}
                    </Text>
                    <Text style={styles.termsDesc}>{terms.description}</Text>
                  </View>
                </View>

                {/* Custom percent input */}
                {terms.type === 'custom' && selectedTerms.type === 'custom' && (
                  <View style={styles.customRow}>
                    <Text style={styles.customLabel}>Deposit %</Text>
                    <TextInput
                      style={styles.customInput}
                      value={customPercent}
                      onChangeText={v => setCustomPercent(v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <Text style={styles.customLabel}>%</Text>
                  </View>
                )}

                {/* Preview split */}
                {selectedTerms.type === terms.type && terms.depositPercent > 0 && terms.type !== 'full_after' && (
                  <View style={styles.splitPreview}>
                    <View style={styles.splitItem}>
                      <Text style={styles.splitItemLabel}>Deposit now</Text>
                      <Text style={[styles.splitItemValue, { color: COLORS.warning }]}>
                        {formatCurrency(calculatePaymentSplit(invoice.total, terms, parseInt(customPercent)).depositAmount)}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="plus" size={16} color={COLORS.textMuted} />
                    <View style={styles.splitItem}>
                      <Text style={styles.splitItemLabel}>On completion</Text>
                      <Text style={[styles.splitItemValue, { color: COLORS.success }]}>
                        {formatCurrency(calculatePaymentSplit(invoice.total, terms, parseInt(customPercent)).finalAmount)}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <Button
              title="Confirm Terms"
              onPress={handleConfirmTerms}
              style={styles.confirmBtn}
            />
          </View>
        )}

        {/* STEP 2 — Payment Summary */}
        {step === 'summary' && (
          <View style={styles.section}>
            <View style={styles.paymentCard}>
              <View style={styles.paymentCardHeader}>
                <MaterialCommunityIcons name="shield-check-outline" size={28} color={COLORS.primary} />
                <Text style={styles.paymentCardTitle}>Secure Payment</Text>
                <Text style={styles.paymentCardSub}>Powered by Stripe</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Client</Text>
                <Text style={styles.paymentValue}>{client?.name}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Job</Text>
                <Text style={styles.paymentValue} numberOfLines={1}>{invoice.jobDescription}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment type</Text>
                <Text style={styles.paymentValue}>
                  {isDepositPayment ? 'Deposit' : isFinalPayment ? 'Final Payment' : 'Full Payment'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Amount Due</Text>
                <Text style={styles.amountValue}>{formatCurrency(paymentAmount)}</Text>
                {invoice.paymentTerms === 'split_50_50' && !isFinalPayment && (
                  <Text style={styles.amountNote}>
                    Remaining {formatCurrency(split.finalAmount)} due on completion
                  </Text>
                )}
              </View>
            </View>

            {/* Test card hint */}
            <View style={styles.testCard}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.warning} />
              <Text style={styles.testCardText}>
                Test mode - use card <Text style={styles.testCardNum}>4242 4242 4242 4242</Text>
              </Text>
            </View>

            <Button
              title={`Pay ${formatCurrency(paymentAmount)}`}
              onPress={handlePay}
              loading={processing}
              style={styles.payBtn}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => router.back()}
              style={{ marginTop: SPACING.sm }}
            />
          </View>
        )}

        {/* STEP 3 — Processing */}
        {step === 'processing' && (
          <View style={styles.centerSection}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
            <Text style={styles.processingSubtext}>Please don't close the app</Text>
          </View>
        )}

        {/* STEP 4 — Success */}
        {step === 'success' && (
          <View style={styles.centerSection}>
            <View style={styles.successCircle}>
              <MaterialCommunityIcons name="check-bold" size={48} color={COLORS.success} />
            </View>
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successAmount}>{formatCurrency(paymentAmount)}</Text>
            <Text style={styles.successDesc}>
              {isDepositPayment
                ? `Deposit received from ${client?.name}.\nRemaining balance: ${formatCurrency(invoice.finalAmount || split.finalAmount)}`
                : `Full payment received from ${client?.name}.\nInvoice is now closed.`}
            </Text>

            <View style={styles.successActions}>
              <Button
                title="Back to Invoices"
                onPress={() => router.replace('/(tabs)/invoices')}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

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
  scroll: { flex: 1 },
  section: { padding: SPACING.lg },
  sectionLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.md },
  invoiceSummaryCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  clientName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  jobDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  totalAmount: { color: COLORS.text, fontWeight: '800' },
  termsCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm,
  },
  termsCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  radioActive: { borderColor: COLORS.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  termsInfo: { flex: 1 },
  termsLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  termsDesc: { fontSize: 12, color: COLORS.textSecondary },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  customLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  customInput: {
    backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 6, color: COLORS.text,
    fontSize: 15, fontWeight: '700', width: 60, textAlign: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  splitPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  splitItem: { alignItems: 'center' },
  splitItemLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  splitItemValue: { fontSize: 16, fontWeight: '800' },
  confirmBtn: { marginTop: SPACING.lg },
  paymentCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  paymentCardHeader: { alignItems: 'center', paddingBottom: SPACING.md },
  paymentCardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: SPACING.sm },
  paymentCardSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  paymentLabel: { fontSize: 13, color: COLORS.textSecondary },
  paymentValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  amountBox: { alignItems: 'center', paddingVertical: SPACING.md },
  amountLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  amountValue: { fontSize: 36, fontWeight: '900', color: COLORS.text },
  amountNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: 'center' },
  testCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.warning + '15', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.warning + '33',
  },
  testCardText: { fontSize: 12, color: COLORS.warning, flex: 1 },
  testCardNum: { fontWeight: '700', letterSpacing: 1 },
  payBtn: { marginBottom: SPACING.sm },
  centerSection: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: SPACING.lg },
  processingText: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg },
  processingSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.success + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2, borderColor: COLORS.success + '44',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  successAmount: { fontSize: 36, fontWeight: '900', color: COLORS.success, marginBottom: SPACING.md },
  successDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  successActions: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  errorText: { fontSize: 16, color: COLORS.error },
});
