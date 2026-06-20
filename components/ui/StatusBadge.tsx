import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../lib/constants';

type Status = 'draft' | 'sent' | 'accepted' | 'declined' | 'paid' | 'overdue' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<Status, { label: string; bg: string; color: string }> = {
  draft:       { label: 'Draft',       bg: '#202A35', color: COLORS.textSecondary },
  sent:        { label: 'Sent',        bg: '#173047', color: '#8CBDEB' },
  accepted:    { label: 'Accepted',    bg: '#11362F', color: COLORS.success },
  declined:    { label: 'Declined',    bg: '#3A1D21', color: COLORS.error },
  paid:        { label: 'Paid',        bg: '#11362F', color: COLORS.success },
  overdue:     { label: 'Overdue',     bg: '#3A1D21', color: COLORS.error },
  scheduled:   { label: 'Scheduled',   bg: '#172A3F', color: '#8CBDEB' },
  in_progress: { label: 'In Progress', bg: '#362A12', color: COLORS.warning },
  completed:   { label: 'Completed',   bg: '#11362F', color: COLORS.success },
  cancelled:   { label: 'Cancelled',   bg: '#202A35', color: COLORS.textMuted },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.full },
  text: { fontSize: 11, fontWeight: '700' },
});
