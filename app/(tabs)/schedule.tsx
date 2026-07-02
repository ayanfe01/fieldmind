import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, startOfWeek } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { JobStatus } from '../../lib/types';
import { openDirections } from '../../lib/maps';
import { formatCurrency } from '../../lib/payments';

export default function ScheduleScreen() {
  const router = useRouter();
  const { user, jobs, clients, quotes, conversations, invoices, updateJob, addJob, addClient, addInvoice, addMessage, startConversation } = useAppStore();
  const themedAlert = useThemedAlert();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJob, setNewJob] = useState({ clientName: '', clientPhone: '', title: '', address: '', time: '09:00', estimatedHours: '2' });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  // Show own jobs AND jobs where this user is the assigned pro
  const ownJobs = jobs.filter(job => !job.ownerId || job.ownerId === user?.id || job.assignedProId === user?.id);
  // Active schedule: exclude cancelled and jobs that are done + invoice already sent
  const dayJobs = ownJobs.filter(j =>
    j.scheduledDate === selectedDateStr &&
    j.status !== 'cancelled' &&
    !(j.status === 'completed' && j.invoiceSentAt)
  );
  const getClient = (id: string) => clients.find(c => c.id === id);

  const getStatusColor = (status: JobStatus) => {
    if (status === 'completed') return COLORS.success;
    if (status === 'in_progress') return COLORS.warning;
    if (status === 'scheduled') return '#7B9FFF';
    return COLORS.textMuted;
  };

  const callClient = (phone?: string) => {
    if (!phone) {
      themedAlert.show({
        title: 'No phone number',
        message: 'Add a phone number for this client before calling.',
        icon: 'phone-alert-outline',
      });
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      themedAlert.show({
        title: 'Call unavailable',
        message: 'Your device could not start a phone call.',
        icon: 'phone-off-outline',
      });
    });
  };

  const navigateTo = (address: string) => {
    openDirections(address).catch(() => {
      themedAlert.show({
        title: 'Maps unavailable',
        message: 'Your device could not open maps for this job.',
        icon: 'map-marker-off-outline',
      });
    });
  };

  const sendInvoiceFromJob = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const quote = job.quoteId ? quotes.find(q => q.id === job.quoteId) : undefined;
    const amount = quote?.total ?? 0;
    const jobDescription = quote?.jobDescription || job.title;

    // Prefer existing invoice to avoid duplicates
    const existingInvoice = invoices.find(inv => inv.quoteId === job.quoteId && job.quoteId);
    const invoiceId = existingInvoice?.id ?? `invoice-${Date.now()}`;
    if (!existingInvoice) {
      if (amount <= 0) {
        themedAlert.show({
          title: 'No invoice amount',
          message: 'This job has no linked quote with a total. Go to Quotes to create and send an invoice.',
          icon: 'receipt-text-remove-outline',
          actions: [
            { label: 'Go to Quotes', icon: 'file-document-edit-outline', onPress: () => router.push('/(tabs)/quotes') },
            { label: 'Cancel', variant: 'ghost' },
          ],
        });
        return;
      }
      addInvoice({
        id: invoiceId,
        quoteId: job.quoteId,
        clientId: job.clientId || job.ownerId || '',
        jobDescription,
        lineItems: quote?.lineItems ?? [{ id: '1', description: jobDescription, quantity: 1, unitPrice: amount, total: amount }],
        subtotal: quote?.subtotal ?? amount,
        tax: quote?.tax ?? 0,
        total: amount,
        status: 'sent',
        dueDate: addDays(new Date(), 7).toISOString(),
        createdAt: new Date().toISOString(),
        paymentTerms: quote?.paymentTerms,
        paymentStatus: 'unpaid',
      });
    }

    const participantId = job.ownerId || job.clientId || '';
    if (!participantId) {
      themedAlert.show({
        title: 'No customer found',
        message: 'Go to Messages to find the customer and send the invoice from the chat.',
        icon: 'message-alert-outline',
        actions: [
          { label: 'Go to Messages', icon: 'message-outline', onPress: () => router.push('/(tabs)/messages') },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
      return;
    }

    const isUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    // Direct conversation search: by jobId, by participantUserIds, or by participantId
    const linkedConv = conversations.find(c => c.jobId === job.id)
      || conversations.find(c => c.participantUserIds?.includes(participantId))
      || conversations.find(c => c.participantId === participantId);

    const conversationId = linkedConv?.id || startConversation({
      participantId,
      participantUserId: isUuid(participantId) ? participantId : undefined,
      participantName: linkedConv?.participantName || 'Customer',
      participantRole: 'customer',
      subject: `Invoice: ${jobDescription}`,
      jobId: job.id,
    });

    if (!conversationId) {
      router.push('/(tabs)/messages');
      return;
    }

    try {
      await addMessage(
        conversationId,
        `The job is complete. Here is the invoice for "${jobDescription}". Please review and pay when ready.`,
        undefined,
        {
          actionType: 'invoice_payment',
          actionLabel: `Pay ${formatCurrency(amount)}`,
          actionPayload: { invoiceId, amount, type: 'deposit' },
        }
      );
      // Stamp invoiceSentAt so this job moves out of the active schedule
      updateJob(jobId, { invoiceSentAt: new Date().toISOString() });
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch {
      themedAlert.show({
        title: 'Could not send invoice',
        message: 'The invoice was created. Go to Messages to send it from the chat.',
        icon: 'message-alert-outline',
        actions: [
          { label: 'Go to Messages', icon: 'message-outline', onPress: () => router.push('/(tabs)/messages') },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
    }
  };

  const resetNewJob = () => {
    setNewJob({ clientName: '', clientPhone: '', title: '', address: '', time: '09:00', estimatedHours: '2' });
  };

  const createScheduledJob = () => {
    if (!newJob.clientName.trim() || !newJob.title.trim() || !newJob.address.trim()) {
      themedAlert.show({
        title: 'Missing job details',
        message: 'Add the client name, job title, and address before scheduling.',
        icon: 'calendar-alert-outline',
      });
      return;
    }
    const now = new Date().toISOString();
    const clientId = `manual-${Date.now()}`;
    addClient({
      id: clientId,
      name: newJob.clientName.trim(),
      phone: newJob.clientPhone.trim(),
      address: newJob.address.trim(),
      createdAt: now,
    });
    addJob({
      id: '',
      clientId,
      title: newJob.title.trim(),
      description: newJob.title.trim(),
      scheduledDate: selectedDateStr,
      scheduledTime: newJob.time.trim() || '09:00',
      estimatedHours: parseFloat(newJob.estimatedHours) || 2,
      status: 'scheduled',
      address: newJob.address.trim(),
      createdAt: now,
    });
    setShowAddModal(false);
    resetNewJob();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/job-history')}>
            <MaterialCommunityIcons name="history" size={18} color={COLORS.textSecondary} />
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.newBtnText}>+ Job</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll} contentContainerStyle={styles.weekStrip}>
        {weekDays.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          const isSelected = dayStr === selectedDateStr;
          const hasJobs = ownJobs.some(j => j.scheduledDate === dayStr && j.status !== 'cancelled');
          return (
            <TouchableOpacity key={dayStr} style={[styles.dayBtn, isSelected && styles.dayBtnActive]} onPress={() => setSelectedDate(day)}>
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelActive]}>{format(day, 'EEE')}</Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumActive]}>{format(day, 'd')}</Text>
              {hasJobs && <View style={[styles.dot, isSelected && styles.dotActive]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.dateHeading}>
        <Text style={styles.dateText}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
        <Text style={styles.jobCount}>{dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {dayJobs.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No jobs this day</Text>
              <Text style={styles.emptySubtext}>Tap + Job to add one</Text>
            </View>
          ) : dayJobs.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)).map(job => {
            const client = getClient(job.clientId);
            const linkedConv = conversations.find(c => c.jobId === job.id || (job.ownerId && c.participantUserIds?.includes(job.ownerId)));
            const displayName = client?.name || linkedConv?.participantName || 'Customer';
            return (
              <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => router.push({ pathname: '/job-detail', params: { jobId: job.id } })} activeOpacity={0.85}>
                <View style={[styles.timeBar, { backgroundColor: getStatusColor(job.status) }]} />
                <View style={styles.jobContent}>
                  <View style={styles.jobTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTime}>{job.scheduledTime}</Text>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.clientName}>{displayName}</Text>
                      <Text style={styles.jobAddress}>{job.address}</Text>
                    </View>
                    <View style={styles.jobMeta}>
                      <StatusBadge status={job.status} />
                      <Text style={styles.hours}>{job.estimatedHours}h</Text>
                    </View>
                  </View>
                  <View style={styles.jobActions}>
                    {job.status === 'scheduled' && (
                      <TouchableOpacity style={styles.actionChip} onPress={(event) => { event.stopPropagation(); updateJob(job.id, { status: 'in_progress' }); }}>
                        <Text style={styles.actionText}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {job.status === 'in_progress' && (
                      <TouchableOpacity
                        style={[styles.actionChip, styles.actionGreen]}
                        onPress={(event) => {
                          event.stopPropagation();
                          updateJob(job.id, { status: 'completed', completedAt: new Date().toISOString() });
                          themedAlert.show({
                            title: 'Job completed!',
                            message: 'Send the customer an invoice to request payment.',
                            icon: 'check-circle-outline',
                            actions: [
                              { label: 'Send Invoice', icon: 'receipt-text-send-outline', onPress: () => void sendInvoiceFromJob(job.id) },
                              { label: 'Later', variant: 'ghost' },
                            ],
                          });
                        }}
                      >
                        <Text style={[styles.actionText, { color: COLORS.success }]}>Complete</Text>
                      </TouchableOpacity>
                    )}
                    {job.status === 'completed' && !job.invoiceSentAt && (
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={(event) => { event.stopPropagation(); void sendInvoiceFromJob(job.id); }}>
                        <MaterialCommunityIcons name="receipt-text-send-outline" size={13} color={COLORS.success} />
                        <Text style={[styles.actionText, { color: COLORS.success }]}>Send Invoice</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionChip} onPress={(event) => { event.stopPropagation(); callClient(client?.phone); }}><Text style={styles.actionText}>Call</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionChip} onPress={(event) => { event.stopPropagation(); navigateTo(job.address); }}><Text style={styles.actionText}>Navigate</Text></TouchableOpacity>
                    {job.status !== 'completed' && (
                      <TouchableOpacity
                        style={[styles.actionChip, styles.actionDanger]}
                        onPress={(event) => {
                          event.stopPropagation();
                          themedAlert.show({
                            title: 'Cancel this job?',
                            message: `"${job.title}" will be moved out of your schedule. This cannot be undone.`,
                            icon: 'calendar-remove-outline',
                            actions: [
                              {
                                label: 'Cancel Job',
                                variant: 'danger',
                                icon: 'close-circle-outline',
                                onPress: () => updateJob(job.id, { status: 'cancelled' }),
                              },
                              { label: 'Keep', variant: 'ghost' },
                            ],
                          });
                        }}
                      >
                        <MaterialCommunityIcons name="close-circle-outline" size={13} color={COLORS.error} />
                        <Text style={[styles.actionText, { color: COLORS.error }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setShowAddModal(false); resetNewJob(); }} />
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Schedule a Job</Text>
                <TouchableOpacity style={styles.modalClose} onPress={() => { setShowAddModal(false); resetNewJob(); }}>
                  <MaterialCommunityIcons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Client Name</Text>
              <TextInput style={styles.input} placeholder="e.g. John Smith" placeholderTextColor={COLORS.textMuted} value={newJob.clientName} onChangeText={t => setNewJob(p => ({ ...p, clientName: t }))} />
              <Text style={styles.inputLabel}>Client Phone (optional)</Text>
              <TextInput style={styles.input} placeholder="+1 555 000 0000" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={newJob.clientPhone} onChangeText={t => setNewJob(p => ({ ...p, clientPhone: t }))} />
              <Text style={styles.inputLabel}>Job Title</Text>
              <TextInput style={styles.input} placeholder="e.g. Fix kitchen sink" placeholderTextColor={COLORS.textMuted} value={newJob.title} onChangeText={t => setNewJob(p => ({ ...p, title: t }))} />
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput style={styles.input} placeholder="Customer address" placeholderTextColor={COLORS.textMuted} value={newJob.address} onChangeText={t => setNewJob(p => ({ ...p, address: t }))} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TextInput style={styles.input} placeholder="09:00" placeholderTextColor={COLORS.textMuted} value={newJob.time} onChangeText={t => setNewJob(p => ({ ...p, time: t }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Est. Hours</Text>
                  <TextInput style={styles.input} placeholder="2" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={newJob.estimatedHours} onChangeText={t => setNewJob(p => ({ ...p, estimatedHours: t }))} />
                </View>
              </View>
              <View style={styles.modalActions}>
                <Button title="Cancel" variant="secondary" onPress={() => { setShowAddModal(false); resetNewJob(); }} style={{ flex: 1 }} />
                <Button title="Add Job" style={{ flex: 1 }} onPress={createScheduledJob} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  historyBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  newBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  weekScroll: { maxHeight: 80 },
  weekStrip: { paddingHorizontal: SPACING.lg, gap: 8, alignItems: 'center' },
  dayBtn: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, minWidth: 46 },
  dayBtnActive: { backgroundColor: COLORS.primary },
  dayLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  dayLabelActive: { color: '#fff' },
  dayNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dayNumActive: { color: '#fff' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 2 },
  dotActive: { backgroundColor: '#fff' },
  dateHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  dateText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  jobCount: { fontSize: 13, color: COLORS.textSecondary },
  scroll: { flex: 1 },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  jobCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  timeBar: { width: 4 },
  jobContent: { flex: 1, padding: SPACING.md },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between' },
  jobTime: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  jobTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  clientName: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  jobAddress: { fontSize: 12, color: COLORS.textSecondary },
  jobMeta: { alignItems: 'flex-end', gap: 8 },
  hours: { fontSize: 12, color: COLORS.textMuted },
  jobActions: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  actionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  actionGreen: { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '11' },
  actionDanger: { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '11' },
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: SPACING.sm },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: SPACING.lg, paddingBottom: 150 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});
