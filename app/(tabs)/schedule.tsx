import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, startOfWeek } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { JobStatus } from '../../lib/types';

export default function ScheduleScreen() {
  const router = useRouter();
  const { jobs, clients, updateJob, addJob } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', address: '', time: '09:00', estimatedHours: '2' });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const dayJobs = jobs.filter(j => j.scheduledDate === selectedDateStr && j.status !== 'cancelled');
  const getClient = (id: string) => clients.find(c => c.id === id);

  const getStatusColor = (status: JobStatus) => {
    if (status === 'completed') return COLORS.success;
    if (status === 'in_progress') return COLORS.warning;
    if (status === 'scheduled') return '#7B9FFF';
    return COLORS.textMuted;
  };

  const callClient = (phone?: string) => {
    if (!phone) {
      Alert.alert('No phone number', 'Add a phone number for this client before calling.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Call unavailable', 'Your device could not start a phone call.');
    });
  };

  const navigateTo = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps unavailable', 'Your device could not open maps for this job.');
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowAddModal(true)}>
          <Text style={styles.newBtnText}>+ Job</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll} contentContainerStyle={styles.weekStrip}>
        {weekDays.map(day => {
          const dayStr = day.toISOString().split('T')[0];
          const isSelected = dayStr === selectedDateStr;
          const hasJobs = jobs.some(j => j.scheduledDate === dayStr && j.status !== 'cancelled');
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
            return (
              <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => router.push({ pathname: '/job-detail', params: { jobId: job.id } })} activeOpacity={0.85}>
                <View style={[styles.timeBar, { backgroundColor: getStatusColor(job.status) }]} />
                <View style={styles.jobContent}>
                  <View style={styles.jobTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTime}>{job.scheduledTime}</Text>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.clientName}>{client?.name}</Text>
                      <Text style={styles.jobAddress}>{job.address}</Text>
                    </View>
                    <View style={styles.jobMeta}>
                      <StatusBadge status={job.status} />
                      <Text style={styles.hours}>{job.estimatedHours}h</Text>
                    </View>
                  </View>
                  <View style={styles.jobActions}>
                    {job.status === 'scheduled' && (
                      <TouchableOpacity style={styles.actionChip} onPress={() => updateJob(job.id, { status: 'in_progress' })}>
                        <Text style={styles.actionText}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {job.status === 'in_progress' && (
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => updateJob(job.id, { status: 'completed' })}>
                        <Text style={[styles.actionText, { color: COLORS.success }]}>Complete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionChip} onPress={() => callClient(client?.phone)}><Text style={styles.actionText}>Call</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionChip} onPress={() => navigateTo(job.address)}><Text style={styles.actionText}>Navigate</Text></TouchableOpacity>
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
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Schedule a Job</Text>
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
                <Button title="Cancel" variant="secondary" onPress={() => setShowAddModal(false)} style={{ flex: 1 }} />
                <Button title="Add Job" style={{ flex: 1 }} onPress={() => {
                  if (!newJob.title || !newJob.address) return;
                  addJob({ id: '', clientId: clients[0]?.id || '1', title: newJob.title, description: newJob.title, scheduledDate: selectedDateStr, scheduledTime: newJob.time, estimatedHours: parseFloat(newJob.estimatedHours) || 2, status: 'scheduled', address: newJob.address, createdAt: new Date().toISOString() });
                  setShowAddModal(false);
                  setNewJob({ title: '', address: '', time: '09:00', estimatedHours: '2' });
                }} />
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
  actionText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: SPACING.sm },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modal: { maxHeight: '88%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalContent: { padding: SPACING.lg, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  row: { flexDirection: 'row', gap: SPACING.sm },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
});
