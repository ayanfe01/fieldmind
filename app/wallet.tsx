import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { formatCurrency, getDeviceCurrency } from '../lib/payments';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';
import { format } from 'date-fns';

export default function WalletScreen() {
  const router = useRouter();
  const { availableBalance, pendingBalance, totalWithdrawn, withdrawals, requestWithdrawal } = useAppStore();
  const themedAlert = useThemedAlert();
  const currency = useMemo(() => getDeviceCurrency(), []);
  const currencySymbol = useMemo(() => {
    try {
      return (0).toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/[\d\s,]/g, '').trim();
    } catch {
      return '$';
    }
  }, [currency]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankLast4, setBankLast4] = useState('4242');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      themedAlert.show({
        title: 'Invalid amount',
        message: 'Please enter a valid amount.',
        icon: 'cash-remove',
      });
      return;
    }
    if (amount > availableBalance) {
      themedAlert.show({
        title: 'Insufficient balance',
        message: `Your available balance is ${formatCurrency(availableBalance)}`,
        icon: 'wallet-outline',
      });
      return;
    }
    if (amount < 10) {
      themedAlert.show({
        title: 'Minimum withdrawal',
        message: 'Minimum withdrawal amount is $10.00',
        icon: 'bank-transfer-out',
      });
      return;
    }

    setProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    requestWithdrawal(amount, bankLast4);
    setProcessing(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
    }, 2000);
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return COLORS.success;
    if (status === 'pending') return COLORS.warning;
    return COLORS.error;
  };

  const statusIcon = (status: string) => {
    if (status === 'completed') return 'check-circle-outline';
    if (status === 'pending') return 'clock-outline';
    return 'close-circle-outline';
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceCardBg} />
          <Text style={styles.balanceLabel}>Available to Withdraw</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
          <Text style={styles.balanceNote}>Received from customer payments · ready to withdraw</Text>

          <TouchableOpacity
            style={styles.withdrawBtn}
            onPress={() => setShowWithdrawModal(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="bank-transfer-out" size={20} color={COLORS.background} />
            <Text style={styles.withdrawBtnText}>Withdraw to Bank</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.warning} />
            <Text style={styles.statValue}>{formatCurrency(pendingBalance)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statHint}>Awaiting job verification</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <MaterialCommunityIcons name="bank-check" size={20} color={COLORS.success} />
            <Text style={styles.statValue}>{formatCurrency(totalWithdrawn)}</Text>
            <Text style={styles.statLabel}>Total Withdrawn</Text>
            <Text style={styles.statHint}>All time</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Payments Work</Text>
          <View style={styles.stepsCard}>
            {[
              { icon: 'cash-fast', color: COLORS.primary, title: 'Customer pays via FieldMind', desc: 'Deposit or full payment collected securely' },
              { icon: 'briefcase-check-outline', color: COLORS.warning, title: 'You complete the job', desc: 'Final payment collected after work is done' },
              { icon: 'bank-transfer', color: COLORS.success, title: 'Funds added to your balance', desc: 'Withdraw anytime, arrives in 1–2 business days' },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: step.color + '18' }]}>
                  <MaterialCommunityIcons name={step.icon as any} size={20} color={step.color} />
                </View>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {i < 2 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        {/* Withdrawal History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Withdrawal History</Text>
          {withdrawals.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="bank-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No withdrawals yet</Text>
            </View>
          ) : (
            withdrawals.map(w => (
              <View key={w.id} style={styles.withdrawalRow}>
                <View style={[styles.withdrawalIcon, { backgroundColor: statusColor(w.status) + '18' }]}>
                  <MaterialCommunityIcons name={statusIcon(w.status) as any} size={20} color={statusColor(w.status)} />
                </View>
                <View style={styles.withdrawalInfo}>
                  <Text style={styles.withdrawalBank}>Bank •••• {w.bankLast4}</Text>
                  <Text style={styles.withdrawalDate}>
                    {format(new Date(w.createdAt), 'MMM d, yyyy')}
                    {w.completedAt ? ` · Arrived ${format(new Date(w.completedAt), 'MMM d')}` : ''}
                  </Text>
                </View>
                <View style={styles.withdrawalRight}>
                  <Text style={styles.withdrawalAmount}>{formatCurrency(w.amount)}</Text>
                  <Text style={[styles.withdrawalStatus, { color: statusColor(w.status) }]}>
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal visible={showWithdrawModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowWithdrawModal(false)} />
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            {!success ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Withdraw Funds</Text>
                  <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                    <MaterialCommunityIcons name="close" size={22} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBalance}>
                  <Text style={styles.modalBalanceLabel}>Available</Text>
                  <Text style={styles.modalBalanceValue}>{formatCurrency(availableBalance)}</Text>
                </View>

                <Text style={styles.inputLabel}>Amount to withdraw</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    autoFocus
                  />
                </View>

                {/* Quick amount buttons */}
                <View style={styles.quickAmounts}>
                  {[availableBalance * 0.25, availableBalance * 0.5, availableBalance].map((amt, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickAmtBtn}
                      onPress={() => setWithdrawAmount(amt.toFixed(2))}
                    >
                      <Text style={styles.quickAmtText}>
                        {i === 2 ? 'All' : `${i === 0 ? '25%' : '50%'}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Bank account (last 4 digits)</Text>
                <TextInput
                  style={styles.bankInput}
                  placeholder="4242"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={4}
                  value={bankLast4}
                  onChangeText={setBankLast4}
                />

                <Text style={styles.modalNote}>
                  Funds typically arrive within 1-2 business days
                </Text>

                <Button
                  title={processing ? 'Processing...' : `Withdraw ${withdrawAmount ? formatCurrency(parseFloat(withdrawAmount) || 0) : ''}`}
                  onPress={handleWithdraw}
                  loading={processing}
                  style={styles.confirmWithdrawBtn}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                />
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons name="check-bold" size={40} color={COLORS.success} />
                </View>
                <Text style={styles.successTitle}>Withdrawal Requested!</Text>
                <Text style={styles.successDesc}>
                  {formatCurrency(parseFloat(withdrawAmount))} will arrive in your bank account within 1-2 business days.
                </Text>
              </View>
            )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  scroll: { flex: 1 },
  balanceCard: {
    margin: SPACING.lg, borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary, padding: SPACING.lg,
    overflow: 'hidden', alignItems: 'center',
  },
  balanceCardBg: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: SPACING.sm },
  balanceAmount: { fontSize: 44, fontWeight: '900', color: '#fff', marginBottom: SPACING.sm },
  balanceNote: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: SPACING.lg, textAlign: 'center' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  withdrawBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.background },
  statsRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  statBox: { flex: 1, padding: SPACING.md, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  statHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  stepsCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  stepIcon: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: COLORS.textSecondary },
  stepConnector: { position: 'absolute', left: 19, top: 44, width: 2, height: SPACING.md + 4, backgroundColor: COLORS.border },
  withdrawalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  withdrawalIcon: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  withdrawalInfo: { flex: 1 },
  withdrawalBank: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  withdrawalDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  withdrawalRight: { alignItems: 'flex-end' },
  withdrawalAmount: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  withdrawalStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: '#000000BB', justifyContent: 'flex-end' },
  modal: { maxHeight: '90%', backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalContent: { padding: SPACING.lg, paddingBottom: 150 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalBalance: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  modalBalanceLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  modalBalanceValue: { fontSize: 24, fontWeight: '900', color: COLORS.success },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: COLORS.textSecondary, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800', color: COLORS.text, paddingVertical: SPACING.md },
  quickAmounts: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  quickAmtBtn: { flex: 1, backgroundColor: COLORS.primary + '18', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '33' },
  quickAmtText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bankInput: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 18, fontWeight: '700', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, letterSpacing: 4 },
  modalNote: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.lg },
  confirmWithdrawBtn: { marginTop: SPACING.sm },
  successContainer: { alignItems: 'center', paddingVertical: SPACING.xl },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.success + '18', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 2, borderColor: COLORS.success + '44' },
  successTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  successDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
