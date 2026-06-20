import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { generateQuoteFromVoice, QuoteGenerationResult } from '../../lib/ai';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';

type Step = 'idle' | 'processing' | 'preview' | 'saved';

export default function VoiceScreen() {
  const router = useRouter();
  const { user, addClient, addQuote, clients } = useAppStore();
  const [step, setStep] = useState<Step>('idle');
  const [transcript, setTranscript] = useState('');
  const [quote, setQuote] = useState<QuoteGenerationResult | null>(null);

  const processTranscript = async () => {
    if (!transcript.trim()) {
      Alert.alert('No description', 'Please describe the job first.');
      return;
    }
    setStep('processing');
    try {
      const result = await generateQuoteFromVoice(transcript, user?.trade || 'general', user?.hourlyRate || 85);
      setQuote(result);
      setStep('preview');
    } catch (e) {
      Alert.alert('Quote unavailable', 'Could not generate a quote from this description. Please try again with a little more job detail.');
      setStep('idle');
    }
  };

  const handleSaveQuote = () => {
    if (!quote) return;
    const clientId = clients[0]?.id || `voice-client-${Date.now()}`;
    if (!clients[0]) {
      addClient({
        id: clientId,
        name: 'Quote Client',
        phone: '',
        address: user?.serviceArea || 'Address not set',
        createdAt: new Date().toISOString(),
      });
    }
    addQuote({
      id: '',
      clientId,
      jobDescription: quote.jobDescription,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      status: 'draft',
      notes: quote.notes,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    setStep('saved');
    setTimeout(() => {
      setStep('idle');
      setTranscript('');
      setQuote(null);
      router.push('/(tabs)/quotes');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice Quote</Text>
          <Text style={styles.subtitle}>Describe the job and let AI draft the quote</Text>
        </View>

        {step === 'idle' && (
          <View style={styles.section}>
            <Text style={styles.label}>Describe the job</Text>
            <TextInput
              style={styles.textarea}
              placeholder="e.g. Replace kitchen faucet, fix leaking p-trap under the sink, customer says it's been dripping for a week..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={transcript}
              onChangeText={setTranscript}
              numberOfLines={6}
            />
            <View style={styles.micRow}>
              <View style={styles.micHint}>
                <MaterialCommunityIcons name="microphone-outline" size={48} color={COLORS.primary} style={styles.micIcon} />
                <Text style={styles.micHintText}>Type your job description above,{'\n'}then tap the button below</Text>
              </View>
            </View>
            <Button title="Generate Quote with AI" onPress={processTranscript} disabled={!transcript.trim()} />
          </View>
        )}

        {step === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>AI is building your quote...</Text>
            <Text style={styles.processingSubtext}>Estimating materials, labor and pricing</Text>
          </View>
        )}

        {step === 'preview' && quote && (
          <View style={styles.section}>
            <View style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <Text style={styles.quoteTitle}>Quote Preview</Text>
                <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI Generated</Text></View>
              </View>
              <Text style={styles.quoteDesc}>{quote.jobDescription}</Text>
              <Text style={styles.estHours}>Estimated: {quote.estimatedHours} hours</Text>
              <View style={styles.divider} />
              <Text style={styles.lineItemsTitle}>Line Items</Text>
              {quote.lineItems.map((item) => (
                <View key={item.id} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemDesc}>{item.description}</Text>
                    <Text style={styles.lineItemQty}>Qty: {item.quantity} x ${item.unitPrice}</Text>
                  </View>
                  <Text style={styles.lineItemTotal}>${item.total.toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>${quote.subtotal.toFixed(2)}</Text></View>
              <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax (9%)</Text><Text style={styles.totalValue}>${quote.tax.toFixed(2)}</Text></View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>${quote.total.toFixed(2)}</Text>
              </View>
              {quote.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{quote.notes}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionRow}>
              <Button title="Start Over" variant="secondary" onPress={() => { setStep('idle'); setQuote(null); }} style={{ flex: 1 }} />
              <Button title="Save Quote" onPress={handleSaveQuote} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {step === 'saved' && (
          <View style={styles.savedContainer}>
            <MaterialCommunityIcons name="check-circle-outline" size={64} color={COLORS.success} style={styles.savedIcon} />
            <Text style={styles.savedText}>Quote Saved!</Text>
            <Text style={styles.savedSubtext}>Redirecting to quotes...</Text>
          </View>
        )}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  header: { padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  section: { padding: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  textarea: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, minHeight: 140, textAlignVertical: 'top', marginBottom: SPACING.lg },
  micRow: { alignItems: 'center', marginBottom: SPACING.lg },
  micHint: { alignItems: 'center' },
  micIcon: { marginBottom: SPACING.sm },
  micHintText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  processingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  processingText: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: SPACING.lg },
  processingSubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: SPACING.sm },
  quoteCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  quoteTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  aiBadge: { backgroundColor: COLORS.primary + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full },
  aiBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  quoteDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 6 },
  estHours: { fontSize: 12, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  lineItemsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  lineItemLeft: { flex: 1, marginRight: SPACING.sm },
  lineItemDesc: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  lineItemQty: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  lineItemTotal: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalValue: { fontSize: 14, color: COLORS.text },
  grandTotal: { paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6 },
  grandTotalLabel: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: COLORS.success },
  notesBox: { backgroundColor: COLORS.surfaceLight, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  notesLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  notesText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  savedContainer: { alignItems: 'center', paddingVertical: 80 },
  savedIcon: { marginBottom: SPACING.md },
  savedText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  savedSubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.sm },
});
