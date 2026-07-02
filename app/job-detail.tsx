import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';
import { MediaUploader } from '../components/ui/MediaUploader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { useThemedAlert } from '../components/ui/ThemedAlertProvider';
import { MediaItem } from '../lib/types';
import { formatCurrency } from '../lib/payments';
import { openDirections } from '../lib/maps';
import { format } from 'date-fns';

export default function JobDetailScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { jobs, clients, invoices, updateJob, updateInvoice, user, startConversation } = useAppStore();
  const themedAlert = useThemedAlert();

  const job = jobs.find(j => j.id === jobId);
  const client = clients.find(c => c.id === job?.clientId);
  const invoice = invoices.find(i => i.id === job?.invoiceId);

  const [showCashModal, setShowCashModal] = useState(false);
  const [cashNote, setCashNote] = useState('');
  const [verifying, setVerifying] = useState(false);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Job not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isTrade = user?.role === 'tradesperson';
  const isCustomer = user?.role === 'customer';
  const canVerify = !isTrade && job.status === 'completed' && job.escrowStatus === 'holding';
  const customerMedia = job.customerMedia || [];
  const completionMedia = job.completionMedia || [];

  const handleAddCustomerMedia = (item: MediaItem) => {
    updateJob(job.id, { customerMedia: [...customerMedia, item] });
  };
  const handleRemoveCustomerMedia = (id: string) => {
    updateJob(job.id, { customerMedia: customerMedia.filter(m => m.id !== id) });
  };
  const handleAddCompletionMedia = (item: MediaItem) => {
    updateJob(job.id, { completionMedia: [...completionMedia, item] });
  };
  const handleRemoveCompletionMedia = (id: string) => {
    updateJob(job.id, { completionMedia: completionMedia.filter(m => m.id !== id) });
  };

  // Customer verifies job is done and releases escrow.
  const handleVerifyJob = async () => {
    themedAlert.show({
      title: 'Confirm Job Complete',
      message: 'By confirming, you verify the work is done to your satisfaction. Payment will be released to the service pro.',
      icon: 'shield-check-outline',
      actions: [
        {
          label: 'Confirm & Release Payment',
          icon: 'cash-check',
          onPress: async () => {
            setVerifying(true);
            await new Promise(r => setTimeout(r, 1200));
            updateJob(job.id, {
              escrowStatus: 'released',
              customerVerifiedAt: new Date().toISOString(),
            });
            if (invoice) {
              updateInvoice(invoice.id, {
                status: 'paid',
                paidAt: new Date().toISOString(),
                paymentStatus: 'fully_paid',
              });
            }
            setVerifying(false);
            themedAlert.show({
              title: 'Payment Released',
              message: 'The service pro has been paid. Thank you.',
              icon: 'check-circle-outline',
            });
          },
        },
        { label: 'Not Yet', variant: 'ghost' },
      ],
    });
  };

  // Mark as cash payment
  const handleCashPayment = () => {
    updateJob(job.id, {
      paymentMethod: 'cash',
      status: 'completed',
      escrowStatus: 'released',
      customerVerifiedAt: new Date().toISOString(),
    });
    if (invoice) {
      updateInvoice(invoice.id, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentStatus: 'fully_paid',
      });
    }
    setShowCashModal(false);
    themedAlert.show({
      title: 'Cash Payment Recorded',
      message: 'This job has been marked as paid in cash.',
      icon: 'cash-check',
    });
  };

  // Service pro marks job complete and puts payment in escrow.
  const handleMarkComplete = () => {
    themedAlert.show({
      title: 'Mark Job Complete',
      message: 'This will notify the customer to verify and release payment.',
      icon: 'briefcase-check-outline',
      actions: [
      {
        label: 'Mark Complete',
        icon: 'check-circle-outline',
        onPress: () => updateJob(job.id, {
          status: 'completed',
          escrowStatus: 'holding',
        }),
      },
      { label: 'Cancel', variant: 'ghost' },
      ],
    });
  };

  const callClient = () => {
    if (!client?.phone) {
      themedAlert.show({
        title: 'No phone number',
        message: 'Add a phone number for this client before calling.',
        icon: 'phone-alert-outline',
      });
      return;
    }
    Linking.openURL(`tel:${client.phone}`).catch(() => {
      themedAlert.show({
        title: 'Call unavailable',
        message: 'Your device could not start a phone call.',
        icon: 'phone-off-outline',
      });
    });
  };

  const navigateToJob = () => {
    openDirections(job.address).catch(() => {
      themedAlert.show({
        title: 'Maps unavailable',
        message: 'Your device could not open maps for this job.',
        icon: 'map-marker-off-outline',
      });
    });
  };

  const openJobChat = () => {
    const participantId = isTrade ? client?.id : (job.assignedProId || client?.id);
    const participantName = isTrade ? (client?.name || 'Customer') : (job.assignedProName || client?.name || 'Service Pro');
    if (!participantId) {
      themedAlert.show({
        title: 'No conversation yet',
        message: 'A service pro has not been attached to this request yet.',
        icon: 'message-alert-outline',
      });
      return;
    }
    const conversationId = startConversation({
      participantId,
      participantName,
      participantRole: isTrade ? 'customer' : 'tradesperson',
      subject: job.title,
    });
    router.push({
      pathname: '/chat/[conversationId]',
      params: {
        conversationId,
        draft: isTrade ? `Hi ${participantName}, I have an update about "${job.title}".` : `Hi, I have a question about "${job.title}".`,
      },
    });
  };

  const cancelCustomerRequest = () => {
    themedAlert.show({
      title: 'Cancel request?',
      message: 'This will close the request so pros no longer treat it as active.',
      icon: 'file-cancel-outline',
      actions: [
        { label: 'Cancel Request', variant: 'danger', icon: 'close-circle-outline', onPress: () => updateJob(job.id, { status: 'cancelled' }) },
        { label: 'Keep Request', variant: 'ghost' },
      ],
    });
  };

  const escrowStatusColor = job.escrowStatus === 'released' ? COLORS.success :
    job.escrowStatus === 'holding' ? COLORS.warning : COLORS.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Job Summary */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.clientName}>{client?.name}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{job.address}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={14} color={COLORS.textMuted} />
                  <Text style={styles.metaText}>{format(new Date(job.scheduledDate), 'MMM d, yyyy')} at {job.scheduledTime}</Text>
                </View>
              </View>
              <StatusBadge status={job.status} />
            </View>

            {/* Escrow status */}
            {job.escrowStatus && (
              <View style={[styles.escrowBanner, { borderColor: escrowStatusColor + '44', backgroundColor: escrowStatusColor + '12' }]}>
                <MaterialCommunityIcons
                  name={job.escrowStatus === 'released' ? 'lock-open-check-outline' : 'lock-outline'}
                  size={18} color={escrowStatusColor}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.escrowTitle, { color: escrowStatusColor }]}>
                    {job.escrowStatus === 'holding' ? 'Payment in Escrow' :
                     job.escrowStatus === 'released' ? 'Payment Released' : 'Payment Disputed'}
                  </Text>
                  <Text style={styles.escrowDesc}>
                    {job.escrowStatus === 'holding'
                      ? 'Funds are held securely while waiting for customer verification'
                      : job.escrowStatus === 'released'
                      ? `Verified ${job.customerVerifiedAt ? format(new Date(job.customerVerifiedAt), 'MMM d') : ''} - Funds sent to service pro`
                      : 'This payment is under review'}
                  </Text>
                </View>
              </View>
            )}

            {/* Cash payment badge */}
            {job.paymentMethod === 'cash' && (
              <View style={[styles.escrowBanner, { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '12' }]}>
                <MaterialCommunityIcons name="cash" size={18} color={COLORS.success} />
                <Text style={[styles.escrowTitle, { color: COLORS.success }]}>Paid in Cash</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice summary */}
        {invoice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice</Text>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Total</Text>
                <Text style={styles.invoiceTotal}>{formatCurrency(invoice.total)}</Text>
              </View>
              {invoice.depositAmount && invoice.depositAmount > 0 && (
                <>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Deposit</Text>
                    <Text style={[styles.invoiceValue, invoice.depositPaidAt && { color: COLORS.success }]}>
                      {formatCurrency(invoice.depositAmount)} {invoice.depositPaidAt ? 'Paid' : '- Pending'}
                    </Text>
                  </View>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Final</Text>
                    <Text style={styles.invoiceValue}>{formatCurrency(invoice.finalAmount || 0)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Customer Media — what needs doing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isTrade ? "Customer's Photos" : 'Photos of Work Needed'}
          </Text>
          {!isTrade ? (
            <MediaUploader
              media={customerMedia}
              onAdd={handleAddCustomerMedia}
              onRemove={handleRemoveCustomerMedia}
              label=""
              hint="Add photos or videos so the service pro understands the job"
            />
          ) : (
            customerMedia.length === 0 ? (
              <View style={styles.emptyMedia}>
                <MaterialCommunityIcons name="image-off-outline" size={24} color={COLORS.textMuted} />
                <Text style={styles.emptyMediaText}>No photos provided by customer</Text>
              </View>
            ) : (
              <MediaUploader
                media={customerMedia}
                onAdd={() => {}}
                onRemove={() => {}}
                label=""
                hint=""
                maxItems={0}
              />
            )
          )}
        </View>

        {/* Completion Media — tradesperson uploads after */}
        {isTrade && job.status === 'completed' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Photos</Text>
            <MediaUploader
              media={completionMedia}
              onAdd={handleAddCompletionMedia}
              onRemove={handleRemoveCompletionMedia}
              label=""
              hint="Upload photos showing the completed work"
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsStack}>

            {/* Service pro marks work complete. */}
            {isTrade && job.status === 'in_progress' && (
              <Button title="Mark Job Complete" onPress={handleMarkComplete} style={styles.actionBtn} />
            )}

            {isCustomer && invoice && (
              <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push({ pathname: '/invoice-view', params: { invoiceId: invoice.id } })} activeOpacity={0.8}>
                <MaterialCommunityIcons name="receipt-text-outline" size={18} color={COLORS.primary} />
                <Text style={styles.outlineBtnText}>View Invoice</Text>
              </TouchableOpacity>
            )}
            {isCustomer && invoice && invoice.status !== 'paid' && invoice.paymentStatus !== 'fully_paid' && (
              <Button
                title={invoice.paymentStatus === 'deposit_paid' ? `Pay Final Balance ${formatCurrency(invoice.finalAmount || 0)}` : `Pay Invoice ${formatCurrency(invoice.depositAmount || invoice.total)}`}
                onPress={() => router.push({
                  pathname: '/payment',
                  params: {
                    invoiceId: invoice.id,
                    type: invoice.paymentStatus === 'deposit_paid' ? 'final' : 'deposit',
                  },
                })}
                style={styles.actionBtn}
              />
            )}

            {/* Customer — verify job done */}
            {canVerify && (
              <Button
                title="Verify Job Complete & Release Payment"
                onPress={handleVerifyJob}
                loading={verifying}
                style={styles.actionBtn}
              />
            )}

            {/* Cash payment option */}
            {isTrade && !job.paymentMethod && job.status !== 'cancelled' && (
              <TouchableOpacity style={styles.cashBtn} onPress={() => setShowCashModal(true)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="cash" size={20} color={COLORS.success} />
                <Text style={styles.cashBtnText}>Record Cash Payment</Text>
              </TouchableOpacity>
            )}

            {/* Navigate */}
            {isTrade && <TouchableOpacity style={styles.outlineBtn} onPress={navigateToJob} activeOpacity={0.8}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={COLORS.primary} />
              <Text style={styles.outlineBtnText}>Navigate to Job</Text>
            </TouchableOpacity>}

            {/* Call client */}
            {isTrade && <TouchableOpacity style={styles.outlineBtn} onPress={callClient} activeOpacity={0.8}>
              <MaterialCommunityIcons name="phone-outline" size={18} color={COLORS.primary} />
              <Text style={styles.outlineBtnText}>Call {client?.name}</Text>
            </TouchableOpacity>}

            {isTrade && (
              <TouchableOpacity style={styles.outlineBtn} onPress={openJobChat} activeOpacity={0.8}>
                <MaterialCommunityIcons name="message-text-outline" size={18} color={COLORS.primary} />
                <Text style={styles.outlineBtnText}>Message Customer</Text>
              </TouchableOpacity>
            )}

            {isCustomer && job.assignedProId && (
              <TouchableOpacity style={styles.outlineBtn} onPress={() => openJobChat()} activeOpacity={0.8}>
                <MaterialCommunityIcons name="message-text-outline" size={18} color={COLORS.primary} />
                <Text style={styles.outlineBtnText}>Message {job.assignedProName || 'Pro'}</Text>
              </TouchableOpacity>
            )}
            {isCustomer && !invoice && (
              <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push({ pathname: '/find-pro', params: { category: job.customCategory || job.category } })} activeOpacity={0.8}>
                <MaterialCommunityIcons name="account-search-outline" size={18} color={COLORS.primary} />
                <Text style={styles.outlineBtnText}>Find Pros for This Request</Text>
              </TouchableOpacity>
            )}

            {isCustomer && job.status !== 'cancelled' && job.status !== 'completed' && (
              <TouchableOpacity style={[styles.outlineBtn, styles.dangerOutline]} onPress={cancelCustomerRequest} activeOpacity={0.8}>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color={COLORS.error} />
                <Text style={[styles.outlineBtnText, { color: COLORS.error }]}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Cash Payment Modal */}
      <Modal visible={showCashModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowCashModal(false)} />
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Cash Payment</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowCashModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Mark this job as paid in cash. This will not go through Stripe; it only records the payment in FieldMind.
            </Text>
            {invoice && (
              <View style={styles.cashAmountBox}>
                <Text style={styles.cashAmountLabel}>Amount</Text>
                <Text style={styles.cashAmountValue}>{formatCurrency(invoice.total)}</Text>
              </View>
            )}
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)..."
              placeholderTextColor={COLORS.textMuted}
              value={cashNote} onChangeText={setCashNote}
              multiline
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setShowCashModal(false)} style={{ flex: 1 }} />
              <Button title="Record Payment" onPress={handleCashPayment} style={{ flex: 1 }} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  summaryTop: { flexDirection: 'row', gap: SPACING.sm },
  jobTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  clientName: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  metaText: { fontSize: 12, color: COLORS.textSecondary },
  escrowBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderWidth: 1 },
  escrowTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  escrowDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  invoiceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  invoiceLabel: { fontSize: 13, color: COLORS.textSecondary },
  invoiceTotal: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  invoiceValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionsStack: { gap: SPACING.sm },
  actionBtn: {},
  cashBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.success + '12', borderRadius: BORDER_RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.success + '33' },
  cashBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.success },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  dangerOutline: { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '08' },
  emptyMedia: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  emptyMediaText: { fontSize: 13, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: '#000000BB', justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalContent: { padding: SPACING.lg, paddingBottom: 150 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  cashAmountBox: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cashAmountLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  cashAmountValue: { fontSize: 28, fontWeight: '900', color: COLORS.success },
  noteInput: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  errorText: { fontSize: 16, color: COLORS.error },
});
