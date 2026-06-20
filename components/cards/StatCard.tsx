import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING } from '../../lib/constants';

interface StatCardProps {
  label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; trend?: string; color?: string;
}

export function StatCard({ label, value, icon, trend, color = COLORS.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {trend && <Text style={[styles.trend, { color: COLORS.success }]}>{trend}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, minWidth: 150,
  },
  iconBox: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  value: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  trend: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});
