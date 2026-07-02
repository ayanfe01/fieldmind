import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { generateQuoteFromVoice, QuoteGenerationResult } from '../../lib/ai';
import { Button } from '../../components/ui/Button';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/payments';
import { LineItem } from '../../lib/types';

type Step = 'compose' | 'processing' | 'edit' | 'saved';

type Recipient = {
  id: string;
  name: string;
  source: 'client' | 'chat';
  conversationId?: string;
};

const emptyLineItem = (id = String(Date.now())): LineItem => ({
  id,
  description: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
});

const buildManualDraft = (): QuoteGenerationResult => ({
  jobDescription: '',
  estimatedHours: 1,
  lineItems: [emptyLineItem('1')],
  subtotal: 0,
  tax: 0,
  total: 0,
  notes: '',
});

const calculateTotals = (items: LineItem[]) => {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.09 * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
};

export default function VoiceScreen() {
  const router = useRouter();
  const {
    user,
    clients,
    conversations,
    addClient,
    addQuote,
    startConversation,
    addMessage,
  } = useAppStore();
  const themedAlert = useThemedAlert();
  const [step, setStep] = useState<Step>('compose');
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState<QuoteGenerationResult | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');

  const recipients = useMemo<Recipient[]>(() => {
    const fromClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      source: 'client' as const,
    }));
    const fromChats = conversations
      .filter(conversation => conversation.participantRole === 'customer')
      .map(conversation => ({
        id: conversation.participantUserIds?.find(id => id !== user?.id) || conversation.participantId,
        name: conversation.participantName,
        source: 'chat' as const,
        conversationId: conversation.id,
      }));
    const byId = new Map<string, Recipient>();
    [...fromClients, ...fromChats].forEach(recipient => {
      if (recipient.id && !byId.has(recipient.id)) byId.set(recipient.id, recipient);
    });
    return Array.from(byId.values());
  }, [clients, conversations, user?.id]);

  const selectedRecipient = recipients.find(item => item.id === selectedRecipientId);

  const setDraftWithItems = (items: LineItem[]) => {
    if (!draft) return;
    setDraft({ ...draft, lineItems: items, ...calculateTotals(items) });
  };

  const updateDraftField = (field: 'jobDescription' | 'notes' | 'estimatedHours', value: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      [field]: field === 'estimatedHours' ? Number(value) || 0 : value,
    });
  };

  const updateLineItem = (id: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => {
    if (!draft) return;
    const nextItems = draft.lineItems.map(item => {
      if (item.id !== id) return item;
      const next = {
        ...item,
        [field]: field === 'description' ? value : Number(value) || 0,
      };
      return {
        ...next,
        total: Math.round(next.quantity * next.unitPrice * 100) / 100,
      };
    });
    setDraftWithItems(nextItems);
  };

  const addLineItem = () => {
    if (!draft) return;
    setDraftWithItems([...draft.lineItems, emptyLineItem(String(Date.now()))]);
  };

  const removeLineItem = (id: string) => {
    if (!draft) return;
    const nextItems = draft.lineItems.filter(item => item.id !== id);
    setDraftWithItems(nextItems.length ? nextItems : [emptyLineItem(String(Date.now()))]);
  };

  const startManualQuote = () => {
    setDraft(buildManualDraft());
    setStep('edit');
  };

  const processTranscript = async () => {
    if (!transcript.trim()) {
      themedAlert.show({
        title: 'No description',
        message: 'Describe the job first, or start a manual quote.',
        icon: 'file-document-edit-outline',
      });
      return;
    }
    setStep('processing');
    try {
      const result = await generateQuoteFromVoice(transcript, user?.trade || 'general', user?.hourlyRate || 85);
      setDraft({ ...result, ...calculateTotals(result.lineItems) });
      setStep('edit');
    } catch {
      themedAlert.show({
        title: 'Quote unavailable',
        message: 'Could not generate a quote from this description. You can still create one manually.',
        icon: 'file-document-alert-outline',
      });
      setStep('compose');
    }
  };

  const ensureRecipientClient = () => {
    if (!selectedRecipient) return '';
    if (!clients.some(client => client.id === selectedRecipient.id)) {
      addClient({
        id: selectedRecipient.id,
        name: selectedRecipient.name,
        phone: '',
        address: user?.serviceArea || 'Address shared in chat',
        createdAt: new Date().toISOString(),
      });
    }
    return selectedRecipient.id;
  };

  const validateDraft = () => {
    if (!draft) return false;
    if (!draft.jobDescription.trim()) {
      themedAlert.show({ title: 'Add a scope', message: 'Describe the work this quote covers.', icon: 'clipboard-text-outline' });
      return false;
    }
    if (!draft.lineItems.some(item => item.description.trim() && item.total > 0)) {
      themedAlert.show({ title: 'Add line items', message: 'At least one line item needs a description and price.', icon: 'format-list-bulleted' });
      return false;
    }
    return true;
  };

  const saveQuote = (status: 'draft' | 'sent') => {
    if (!draft || !validateDraft()) return '';
    const clientId = status === 'sent' ? ensureRecipientClient() : (selectedRecipient?.id || clients[0]?.id || `quote-client-${Date.now()}`);
    if (!clientId) return '';
    const quoteId = `quote-${Date.now()}`;
    addQuote({
      id: quoteId,
      clientId,
      jobDescription: draft.jobDescription.trim(),
      lineItems: draft.lineItems.filter(item => item.description.trim() || item.total > 0),
      subtotal: draft.subtotal,
      tax: draft.tax,
      total: draft.total,
      status,
      notes: draft.notes,
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    return quoteId;
  };

  const handleSaveDraft = () => {
    const quoteId = saveQuote('draft');
    if (!quoteId) return;
    setStep('saved');
    setTimeout(() => router.push('/(tabs)/quotes'), 700);
  };

  const handleSendQuote = async () => {
    if (!selectedRecipient) {
      themedAlert.show({
        title: 'Choose recipient',
        message: 'Select the customer or chat this quote should go to before sending.',
        icon: 'account-arrow-right-outline',
      });
      return;
    }
    const quoteId = saveQuote('sent');
    if (!quoteId || !draft) return;
    const conversationId = selectedRecipient.conversationId || startConversation({
      participantId: selectedRecipient.id,
      participantUserId: selectedRecipient.id,
      participantName: selectedRecipient.name,
      participantRole: 'customer',
      subject: `Quote: ${draft.jobDescription}`,
      quoteRequested: true,
    });
    await addMessage(conversationId, `I sent a quote for "${draft.jobDescription}".`, undefined, {
      actionType: 'quote_review',
      actionLabel: 'Sent',
      actionPayload: { quoteId, amount: draft.total },
    });
    router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Quote Workspace</Text>
            <Text style={styles.subtitle}>Draft with AI or build it manually, then review before sending.</Text>
          </View>

          {step === 'compose' && (
            <View style={styles.section}>
              <Text style={styles.label}>Job notes</Text>
              <TextInput
                style={styles.textarea}
                placeholder="Describe the work, materials, timing, and any constraints..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={transcript}
                onChangeText={setTranscript}
              />
              <View style={styles.splitActions}>
                <Button title="Manual Quote" variant="secondary" onPress={startManualQuote} style={{ flex: 1 }} />
                <Button title="Generate with AI" onPress={processTranscript} disabled={!transcript.trim()} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Building your editable draft...</Text>
            </View>
          )}

          {step === 'edit' && draft && (
            <View style={styles.section}>
              <View style={styles.editorCard}>
                <Text style={styles.cardTitle}>Recipient</Text>
                {recipients.length === 0 ? (
                  <Text style={styles.helperText}>Start or open a customer chat first, then you can send quotes directly to that customer.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientRow}>
                    {recipients.map(recipient => {
                      const active = selectedRecipientId === recipient.id;
                      return (
                        <TouchableOpacity key={`${recipient.source}-${recipient.id}`} style={[styles.recipientChip, active && styles.recipientChipActive]} onPress={() => setSelectedRecipientId(recipient.id)}>
                          <MaterialCommunityIcons name={recipient.source === 'chat' ? 'message-text-outline' : 'account-outline'} size={15} color={active ? '#071210' : COLORS.textSecondary} />
                          <Text style={[styles.recipientText, active && styles.recipientTextActive]}>{recipient.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <View style={styles.editorCard}>
                <Text style={styles.cardTitle}>Scope</Text>
                <TextInput style={styles.input} placeholder="Job description" placeholderTextColor={COLORS.textMuted} value={draft.jobDescription} onChangeText={value => updateDraftField('jobDescription', value)} multiline />
                <TextInput style={styles.input} placeholder="Estimated hours" placeholderTextColor={COLORS.textMuted} value={String(draft.estimatedHours || '')} onChangeText={value => updateDraftField('estimatedHours', value)} keyboardType="decimal-pad" />
              </View>

              <View style={styles.editorCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Line items</Text>
                  <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
                    <MaterialCommunityIcons name="plus" size={16} color="#071210" />
                    <Text style={styles.addItemText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {draft.lineItems.map(item => (
                  <View key={item.id} style={styles.lineEditor}>
                    <View style={styles.lineTop}>
                      <TextInput style={[styles.input, styles.lineDesc]} placeholder="Description" placeholderTextColor={COLORS.textMuted} value={item.description} onChangeText={value => updateLineItem(item.id, 'description', value)} />
                      <TouchableOpacity style={styles.removeItem} onPress={() => removeLineItem(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={17} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priceRow}>
                      <TextInput style={[styles.input, styles.priceInput]} placeholder="Qty" placeholderTextColor={COLORS.textMuted} value={String(item.quantity || '')} onChangeText={value => updateLineItem(item.id, 'quantity', value)} keyboardType="decimal-pad" />
                      <TextInput style={[styles.input, styles.priceInput]} placeholder="Price" placeholderTextColor={COLORS.textMuted} value={String(item.unitPrice || '')} onChangeText={value => updateLineItem(item.id, 'unitPrice', value)} keyboardType="decimal-pad" />
                      <View style={styles.lineTotal}><Text style={styles.lineTotalText}>{formatCurrency(item.total)}</Text></View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.editorCard}>
                <Text style={styles.cardTitle}>Notes</Text>
                <TextInput style={[styles.input, styles.notesInput]} placeholder="Terms, exclusions, timeline..." placeholderTextColor={COLORS.textMuted} value={draft.notes} onChangeText={value => updateDraftField('notes', value)} multiline />
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatCurrency(draft.subtotal)}</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Tax</Text><Text style={styles.totalValue}>{formatCurrency(draft.tax)}</Text></View>
                <View style={styles.grandTotal}><Text style={styles.grandTotalLabel}>Total</Text><Text style={styles.grandTotalValue}>{formatCurrency(draft.total)}</Text></View>
              </View>

              <View style={styles.splitActions}>
                <Button title="Save Draft" variant="secondary" onPress={handleSaveDraft} style={{ flex: 1 }} />
                <Button title="Send Quote" onPress={handleSendQuote} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          {step === 'saved' && (
            <View style={styles.savedContainer}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color={COLORS.success} />
              <Text style={styles.savedText}>Quote saved</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 140 },
  header: { padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, lineHeight: 20 },
  section: { padding: SPACING.lg, gap: SPACING.md },
  label: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, marginBottom: SPACING.sm },
  textarea: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, minHeight: 150, textAlignVertical: 'top', marginBottom: SPACING.md },
  splitActions: { flexDirection: 'row', gap: SPACING.sm },
  processingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  processingText: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: SPACING.lg },
  editorCard: { gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, color: COLORS.text, fontWeight: '900' },
  helperText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  recipientRow: { gap: SPACING.sm },
  recipientChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  recipientChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  recipientText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '900' },
  recipientTextActive: { color: '#071210' },
  input: { minHeight: 46, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 14 },
  addItemButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary },
  addItemText: { color: '#071210', fontSize: 12, fontWeight: '900' },
  lineEditor: { gap: SPACING.sm, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  lineDesc: { flex: 1 },
  removeItem: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.error + '12', borderWidth: 1, borderColor: COLORS.error + '33' },
  priceRow: { flexDirection: 'row', gap: SPACING.sm },
  priceInput: { flex: 1 },
  lineTotal: { minWidth: 92, alignItems: 'flex-end', justifyContent: 'center' },
  lineTotalText: { color: COLORS.text, fontWeight: '900' },
  notesInput: { minHeight: 90, textAlignVertical: 'top' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  totalValue: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  grandTotalLabel: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  grandTotalValue: { color: COLORS.success, fontSize: 20, fontWeight: '900' },
  savedContainer: { alignItems: 'center', paddingVertical: 90, gap: SPACING.md },
  savedText: { fontSize: 22, color: COLORS.text, fontWeight: '900' },
});
