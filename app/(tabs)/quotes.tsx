import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { addDays, format } from 'date-fns';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { formatCurrency } from '../../lib/payments';
import { buildQuoteShareUrl, generateShareToken, isQuoteLinksConfigured } from '../../lib/quoteLinks';
import { PaymentTermsType, Quote, QuoteStatus } from '../../lib/types';

const FILTERS: { label: string; value: QuoteStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
];

export default function QuotesScreen() {
  const router = useRouter();
  const { quotes, clients, conversations, invoices, updateQuote, deleteQuote, addInvoice, addClient, startConversation, addMessage } = useAppStore();
  const themedAlert = useThemedAlert();
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const getClient = (id: string) => clients.find(c => c.id === id);
  const isUuid = (value?: string) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const getDepositPercent = (paymentTerms?: PaymentTermsType, depositPercent?: number) => {
    if (paymentTerms === 'custom') return depositPercent ?? 30;
    if (paymentTerms === 'split_50_50') return 50;
    if (paymentTerms === 'full_upfront') return 100;
    if (paymentTerms === 'full_after') return 0;
    return undefined;
  };

  const resolveClientForQuote = (quote: Quote) => {
    const existing = getClient(quote.clientId);
    if (existing) return existing;
    const linkedConv = conversations.find(c =>
      c.participantId === quote.clientId ||
      c.participantUserIds?.includes(quote.clientId)
    );
    if (linkedConv) {
      const fallback = { id: quote.clientId, name: linkedConv.participantName, phone: '', address: '', createdAt: new Date().toISOString() };
      addClient(fallback);
      return fallback;
    }
    return null;
  };

  // Find the best existing conversation for a client — checks participantId, participantUserIds, and name
  const findConversationForClient = (clientId: string, clientName: string) =>
    conversations.find(c =>
      c.participantId === clientId ||
      c.participantUserIds?.includes(clientId) ||
      c.participantName?.toLowerCase() === clientName.toLowerCase()
    );

  const buildInvoiceFromQuote = (quote: Quote): string | null => {
    const existing = invoices.find(inv => inv.quoteId === quote.id);
    if (existing) return existing.id;
    if (!quote.total || quote.total <= 0) return null;
    const depositPercent = getDepositPercent(quote.paymentTerms, quote.depositPercent);
    const depositAmount = depositPercent == null ? undefined : Math.round((quote.total * depositPercent) / 100 * 100) / 100;
    const finalAmount = depositAmount == null ? undefined : Math.round((quote.total - depositAmount) * 100) / 100;
    const invoiceId = `invoice-${Date.now()}`;
    addInvoice({
      id: invoiceId,
      quoteId: quote.id,
      clientId: quote.clientId,
      jobDescription: quote.jobDescription,
      lineItems: quote.lineItems,
      subtotal: quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      status: 'sent',
      dueDate: addDays(new Date(), 7).toISOString(),
      notes: quote.notes,
      createdAt: new Date().toISOString(),
      paymentTerms: quote.paymentTerms,
      depositPercent,
      depositAmount,
      finalAmount,
      paymentStatus: 'unpaid',
    });
    return invoiceId;
  };

  const acceptQuote = (quote: Quote) => {
    if (!quote.total || quote.total <= 0) {
      themedAlert.show({
        title: 'Quote has no total',
        message: 'Add line items to this quote before accepting.',
        icon: 'receipt-text-remove-outline',
      });
      return;
    }
    updateQuote(quote.id, { status: 'accepted' });
    buildInvoiceFromQuote(quote);
    themedAlert.show({
      title: 'Quote accepted',
      message: 'An invoice has been created. Send it to the customer via chat to request payment.',
      icon: 'receipt-text-check-outline',
      actions: [
        { label: 'Send Invoice to Chat', icon: 'message-text-outline', onPress: () => void sendInvoiceToChat(quote) },
        { label: 'Close', variant: 'ghost' },
      ],
    });
  };

  const sendInvoiceToChat = async (quote: Quote) => {
    const client = resolveClientForQuote(quote);
    if (!client) {
      themedAlert.show({
        title: 'No customer linked',
        message: 'Could not find the customer for this quote. Go to Messages to find the conversation.',
        icon: 'account-alert-outline',
        actions: [
          { label: 'Go to Messages', icon: 'message-outline', onPress: () => router.push('/(tabs)/messages') },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
      return;
    }
    const invoiceId = buildInvoiceFromQuote(quote);
    if (!invoiceId) {
      themedAlert.show({
        title: 'Quote has no total',
        message: 'This quote has no line items or a $0 total. Edit the quote before sending an invoice.',
        icon: 'receipt-text-remove-outline',
      });
      return;
    }
    const amount = quote.total;
    // Use direct conversation lookup first — avoids creating duplicates when client.id
    // doesn't exactly match the conversation's participantId (e.g. manually created clients)
    const existingConv = findConversationForClient(client.id, client.name);
    const conversationId = existingConv?.id || startConversation({
      participantId: client.id,
      participantUserId: isUuid(client.id) ? client.id : undefined,
      participantName: client.name,
      participantRole: 'customer',
      subject: `Invoice: ${quote.jobDescription}`,
      quoteRequested: false,
    });
    if (!conversationId) return;
    try {
      await addMessage(
        conversationId,
        `Hi ${client.name}, here is the invoice for "${quote.jobDescription}". Please review and pay when ready.`,
        undefined,
        {
          actionType: 'invoice_payment',
          actionLabel: `Pay ${formatCurrency(amount)}`,
          actionPayload: { invoiceId, amount, type: 'deposit' },
        }
      );
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch {
      themedAlert.show({
        title: 'Could not send invoice',
        message: 'The invoice was created but the chat message failed. Try sending from the Messages tab.',
        icon: 'message-alert-outline',
      });
    }
  };

  // Public share link: works for any client, no app or account needed. The
  // client views, e-signs, and accepts on a web page; status syncs back here.
  const shareQuoteLink = async (quote: Quote) => {
    if (!isQuoteLinksConfigured) {
      themedAlert.show({
        title: 'Not configured',
        message: 'Quote links need the Supabase URL configured in the app environment.',
        icon: 'link-off',
      });
      return;
    }
    const token = quote.shareToken || generateShareToken();
    updateQuote(quote.id, {
      shareToken: token,
      ...(quote.status === 'draft' ? { status: 'sent' as QuoteStatus } : {}),
      sentAt: quote.sentAt || new Date().toISOString(),
    });
    const client = getClient(quote.clientId);
    try {
      await Share.share({
        message: `Hi${client?.name ? ` ${client.name}` : ''}, here's your quote for "${quote.jobDescription}" (${formatCurrency(quote.total)}). View and accept it here: ${buildQuoteShareUrl(token)}`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const sendQuote = async (quote: Quote) => {
    const client = resolveClientForQuote(quote);
    if (!client) {
      themedAlert.show({
        title: 'No customer linked',
        message: 'This quote has no customer attached. Go to Jobs or Messages to find the customer, then send the quote from the chat.',
        icon: 'account-alert-outline',
        actions: [
          { label: 'Go to Jobs', icon: 'briefcase-outline', onPress: () => router.push('/(tabs)/jobs') },
          { label: 'Go to Messages', icon: 'message-outline', onPress: () => router.push('/(tabs)/messages') },
          { label: 'Cancel', variant: 'ghost' },
        ],
      });
      return;
    }
    updateQuote(quote.id, { status: 'sent' });
    const existingConv = findConversationForClient(client.id, client.name);
    const conversationId = existingConv?.id || startConversation({
      participantId: client.id,
      participantUserId: isUuid(client.id) ? client.id : undefined,
      participantName: client.name,
      participantRole: 'customer',
      subject: `Quote: ${quote.jobDescription}`,
      quoteRequested: true,
    });
    if (!conversationId) return;
    try {
      await addMessage(
        conversationId,
        `Hi ${client.name}, I sent a quote for "${quote.jobDescription}". Please review it and let me know if you want any changes.`,
        undefined,
        {
          actionType: 'quote_review',
          actionLabel: 'Sent',
          actionPayload: {
            quoteId: quote.id,
            amount: quote.total,
            depositPercent: quote.depositPercent,
            depositAmount: quote.depositPercent ? Math.round(quote.total * quote.depositPercent / 100 * 100) / 100 : undefined,
          },
        }
      );
      router.push({ pathname: '/chat/[conversationId]', params: { conversationId } });
    } catch (error) {
      themedAlert.show({
        title: 'Quote message failed',
        message: error instanceof Error ? error.message : 'The quote was updated, but the chat message could not be sent.',
        icon: 'message-alert-outline',
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Quotes</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/(tabs)/voice')}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyKicker}>Quotes</Text>
              <Text style={styles.emptyText}>No quotes yet</Text>
              <Text style={styles.emptySubtext}>Tap + New to create your first quote</Text>
            </View>
          )}
          {filtered.map(quote => {
            const client = getClient(quote.clientId);
            return (
              <View key={quote.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.clientName}>{client?.name || 'Unknown Client'}</Text>
                    <Text style={styles.jobDesc} numberOfLines={2}>{quote.jobDescription}</Text>
                    <Text style={styles.date}>Created {format(new Date(quote.createdAt), 'MMM d, yyyy')}</Text>
                    {quote.status === 'accepted' && quote.signedName ? (
                      <Text style={[styles.track, { color: COLORS.success }]}>✍️ Signed by {quote.signedName}{quote.acceptedAt ? ` · ${format(new Date(quote.acceptedAt), 'MMM d, h:mm a')}` : ''}</Text>
                    ) : quote.viewedAt && quote.status === 'sent' ? (
                      <Text style={styles.track}>👀 Viewed {format(new Date(quote.viewedAt), 'MMM d, h:mm a')}</Text>
                    ) : quote.sentAt && quote.status === 'sent' ? (
                      <Text style={styles.track}>🔗 Link sent {format(new Date(quote.sentAt), 'MMM d')} — not viewed yet</Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.amount}>{formatCurrency(quote.total)}</Text>
                    <StatusBadge status={quote.status} />
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {(quote.status === 'draft' || quote.status === 'sent') && (
                    <TouchableOpacity style={[styles.actionChip, styles.actionBlue]} onPress={() => void shareQuoteLink(quote)}>
                      <Text style={[styles.actionChipText, { color: COLORS.primary }]}>🔗 Share Link</Text>
                    </TouchableOpacity>
                  )}
                  {quote.status === 'draft' && (
                    <TouchableOpacity style={styles.actionChip} onPress={() => sendQuote(quote)}>
                      <Text style={styles.actionChipText}>Send to Customer</Text>
                    </TouchableOpacity>
                  )}
                  {quote.status === 'sent' && (
                    <>
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => acceptQuote(quote)}>
                        <Text style={[styles.actionChipText, { color: COLORS.success }]}>Customer Accepted</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionChip, styles.actionRed]} onPress={() => updateQuote(quote.id, { status: 'declined' })}>
                        <Text style={[styles.actionChipText, { color: COLORS.error }]}>Mark Declined</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {quote.status === 'accepted' && (() => {
                    const linkedInvoice = invoices.find(inv => inv.quoteId === quote.id);
                    return linkedInvoice ? (
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => void sendInvoiceToChat(quote)}>
                        <Text style={[styles.actionChipText, { color: COLORS.success }]}>Send Invoice to Chat</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.actionChip, styles.actionGreen]} onPress={() => void sendInvoiceToChat(quote)}>
                        <Text style={[styles.actionChipText, { color: COLORS.success }]}>Generate &amp; Send Invoice</Text>
                      </TouchableOpacity>
                    );
                  })()}
                  <TouchableOpacity style={styles.actionChip} onPress={() => themedAlert.show({
                    title: 'Delete quote?',
                    message: 'This quote will be removed from your list.',
                    icon: 'file-document-remove-outline',
                    actions: [
                      { label: 'Delete', variant: 'danger', icon: 'trash-can-outline', onPress: () => deleteQuote(quote.id) },
                      { label: 'Cancel', variant: 'ghost' },
                    ],
                  })}>
                    <Text style={styles.actionChipText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.screenTop, paddingBottom: SPACING.md },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  newBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BORDER_RADIUS.full },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterScroll: { maxHeight: 48 },
  filters: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  scroll: { flex: 1, marginTop: SPACING.sm },
  list: { padding: SPACING.lg, gap: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1, marginRight: SPACING.sm },
  clientName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  jobDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 6 },
  date: { fontSize: 11, color: COLORS.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  actionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  actionGreen: { borderColor: COLORS.success + '44', backgroundColor: COLORS.success + '11' },
  actionRed: { borderColor: COLORS.error + '44', backgroundColor: COLORS.error + '11' },
  actionBlue: { borderColor: COLORS.primary + '44', backgroundColor: COLORS.primary + '11' },
  track: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, fontWeight: '600' },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyKicker: { fontSize: 16, fontWeight: '800', color: COLORS.textMuted, marginBottom: SPACING.md },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
});
