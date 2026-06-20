import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../lib/constants';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';

function MetricCard({
  icon, label, value, accent = COLORS.primary,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.iconBox, { backgroundColor: accent + '18' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={accent} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const {
    user, isAuthenticated, authInitialized, clients, jobs, quotes, invoices, pendingBalance, availableBalance, logout,
  } = useAppStore();

  if (!authInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.role !== 'admin') {
    return <Redirect href="/(tabs)" />;
  }

  const paidRevenue = invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const openJobs = jobs.filter(job => job.status === 'scheduled' || job.status === 'in_progress').length;
  const openQuotes = quotes.filter(quote => quote.status === 'draft' || quote.status === 'sent').length;

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Admin</Text>
          <Text style={styles.title}>FieldMind Control</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={signOut}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <MetricCard icon="shield-check-outline" label="Auth" value="Live" />
          <MetricCard icon="briefcase-check-outline" label="Open Jobs" value={`${openJobs}`} />
          <MetricCard icon="file-document-edit-outline" label="Open Quotes" value={`${openQuotes}`} accent={COLORS.warning} />
          <MetricCard icon="cash-check" label="Paid Revenue" value={`$${paidRevenue.toFixed(0)}`} accent={COLORS.success} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Platform Snapshot</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Clients</Text>
            <Text style={styles.rowValue}>{clients.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Invoices</Text>
            <Text style={styles.rowValue}>{invoices.length}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Available balance</Text>
            <Text style={styles.rowValue}>${availableBalance.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Pending balance</Text>
            <Text style={styles.rowValue}>${pendingBalance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Admin Account</Text>
          <Text style={styles.adminText}>{user.name}</Text>
          <Text style={styles.adminSubtext}>{user.email}</Text>
          <Button title="Sign Out" variant="secondary" onPress={signOut} style={styles.signOutBtn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kicker: { fontSize: 12, color: COLORS.primary, fontWeight: '800', textTransform: 'uppercase', marginBottom: 3 },
  title: { fontSize: 24, color: COLORS.text, fontWeight: '900' },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metricCard: {
    width: '48%',
    minHeight: 128,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  metricValue: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginBottom: 2 },
  metricLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  panelTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  rowLabel: { fontSize: 14, color: COLORS.textSecondary },
  rowValue: { fontSize: 14, color: COLORS.text, fontWeight: '800' },
  adminText: { fontSize: 18, color: COLORS.text, fontWeight: '800', marginBottom: 4 },
  adminSubtext: { fontSize: 14, color: COLORS.textSecondary },
  signOutBtn: { marginTop: SPACING.md },
});
