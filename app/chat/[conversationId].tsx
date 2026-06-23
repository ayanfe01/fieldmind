import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { addDays } from 'date-fns';
import { COLORS, SPACING, BORDER_RADIUS } from '../../lib/constants';
import { generateQuoteFromVoice, QuoteGenerationResult } from '../../lib/ai';
import { formatCurrency } from '../../lib/payments';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../../components/ui/Avatar';
import { useThemedAlert } from '../../components/ui/ThemedAlertProvider';
import { LineItem } from '../../lib/types';

const emptyEstimate = (subject?: string): QuoteGenerationResult => ({
  jobDescription: subject || '',
  estimatedHours: 1,
  lineItems: [{
    id: '1',
    description: subject || '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  }],
  subtotal: 0,
  tax: 0,
  total: 0,
  notes: '',
});

const calculateEstimateTotals = (items: LineItem[]) => {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const tax = Math.round(subtotal * 0.09 * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const themedAlert = useThemedAlert();
  const { conversationId, draft: initialDraft } = useLocalSearchParams<{ conversationId: string; draft?: string }>();
  const { conversations, messages, jobs, quotes, clients, addClient, addJob, addQuote, addInvoice, assignJobToPro, addMessage, updateQuote, user, profilePhoto, refreshCloudData } = useAppStore();
  const [draft, setDraft] = useState(initialDraft || '');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [createType, setCreateType] = useState<'quote' | 'invoice' | null>(null);
  const [modalTab, setModalTab] = useState<'create' | 'pick'>('create');
  const [estimatePrompt, setEstimatePrompt] = useState('');
  const [estimateDraft, setEstimateDraft] = useState<QuoteGenerationResult | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAwardJobs, setShowAwardJobs] = useState(false);
  // Booking flow state
  const [bookingPayload, setBookingPayload] = useState<{ quoteId: string; amount: number; depositAmount?: number } | null>(null);
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const conversation = conversations.find(item => item.id === conversationId);
  const otherUserId = conversation?.participantUserIds?.find(id => id !== user?.id) || conversation?.participantId;
  const canUseProTools = user?.role === 'tradesperson';
  const canAwardJob = user?.role === 'customer' && !!otherUserId;
  const openCustomerJobs = useMemo(
    () => jobs.filter(job => job.ownerId === user?.id && !job.assignedProId && job.status === 'scheduled'),
    [jobs, user?.id]
  );
  const threadMessages = useMemo(
    () => messages.filter(message => message.conversationId === conversationId),
    [conversationId, messages]
  );

  const send = async () => {
    if (!conversationId || (!draft.trim() && !pendingPhoto) || sending) return;
    const messageText = draft;
    const photo = pendingPhoto;
    setDraft('');
    setPendingPhoto(null);
    setSending(true);
    try {
      await addMessage(conversationId, messageText, photo ? { uri: photo, type: 'image' } : undefined);
    } catch (error) {
      setDraft(messageText);
      setPendingPhoto(photo);
      themedAlert.show({
        title: 'Message failed',
        message: error instanceof Error ? error.message : 'Could not send this message. Please try again.',
        icon: 'message-alert-outline',
      });
    } finally {
      setSending(false);
    }
  };

  const closeCreateModal = () => {
    setCreateType(null);
    setModalTab('create');
    setEstimatePrompt('');
    setEstimateDraft(null);
    setAiGenerating(false);
  };

  const openCreateModal = (type: 'quote' | 'invoice') => {
    setCreateType(type);
    setModalTab('create');
    setEstimatePrompt(conversation?.subject || '');
    setEstimateDraft(emptyEstimate(conversation?.subject));
  };

  const isQuoteAlreadyResponded = (quoteId?: string) =>
    !!quoteId && threadMessages.some(m =>
      (m.actionType === 'booking_confirmed' || m.actionType === 'quote_declined') &&
      m.actionPayload?.quoteId === quoteId
    );

  const openBookingFlow = (quoteId: string, amount: number, depositAmount?: number) => {
    setBookingPayload({ quoteId, amount, depositAmount });
    setBookingAddress('');
    setBookingDate('');
    setBookingTime('');
    setBookingNotes('');
  };

  const closeBookingFlow = () => setBookingPayload(null);

  const submitBooking = async () => {
    if (!bookingPayload || !conversationId) return;
    if (!bookingAddress.trim()) {
      themedAlert.show({ title: 'Address required', message: 'Please enter the service address so the pro knows where to go.', icon: 'map-marker-alert-outline' });
      return;
    }
    setBookingSubmitting(true);
    try {
      const lines = [
        `Address: ${bookingAddress.trim()}`,
        bookingDate.trim() ? `Preferred date: ${bookingDate.trim()}` : null,
        bookingTime.trim() ? `Preferred time: ${bookingTime.trim()}` : null,
        bookingNotes.trim() ? `Notes: ${bookingNotes.trim()}` : null,
      ].filter(Boolean).join('\n');
      await addMessage(
        conversationId,
        `I've accepted the quote. Here are the job details:\n\n${lines}`,
        undefined,
        {
          actionType: 'booking_confirmed',
          actionLabel: 'Booked',
          actionPayload: {
            quoteId: bookingPayload.quoteId,
            amount: bookingPayload.amount,
            depositAmount: bookingPayload.depositAmount,
            address: bookingAddress.trim(),
            preferredDate: bookingDate.trim() || undefined,
            preferredTime: bookingTime.trim() || undefined,
            notes: bookingNotes.trim() || undefined,
          },
        }
      );
      // Create job in the pro's schedule
      const jobTitle = conversation?.subject || 'Service booking';
      const scheduledDate = new Date().toISOString().split('T')[0]; // fallback to today; pro can reschedule
      addJob({
        id: '',
        clientId: user?.id || '',
        title: jobTitle,
        description: [
          bookingDate.trim() ? `Preferred date: ${bookingDate.trim()}` : null,
          bookingTime.trim() ? `Preferred time: ${bookingTime.trim()}` : null,
          bookingNotes.trim() ? bookingNotes.trim() : null,
        ].filter(Boolean).join('\n') || jobTitle,
        scheduledDate,
        scheduledTime: bookingTime.trim() || 'Flexible',
        estimatedHours: 2,
        status: 'scheduled',
        address: bookingAddress.trim(),
        quoteId: bookingPayload.quoteId || undefined,
        assignedProId: otherUserId || undefined,
        assignedProName: conversation?.participantName,
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      closeBookingFlow();
    } catch {
      themedAlert.show({ title: 'Booking failed', message: 'Could not confirm the booking. Please try again.', icon: 'calendar-alert' });
    } finally {
      setBookingSubmitting(false);
    }
  };

  const sendDraftQuote = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote || !conversationId) return;
    const clientId = ensureChatClient();
    if (!clientId) return;
    updateQuote(quoteId, { status: 'sent' });
    await addMessage(
      conversationId,
      `I sent a quote for "${quote.jobDescription}".`,
      undefined,
      {
        actionType: 'quote_review',
        actionLabel: 'Sent',
        actionPayload: {
          quoteId,
          amount: quote.total,
          depositAmount: quote.depositPercent ? Math.round(quote.total * quote.depositPercent / 100 * 100) / 100 : undefined,
        },
      }
    );
    closeCreateModal();
  };

  const generateEstimateWithAI = async () => {
    const prompt = estimatePrompt.trim() || estimateDraft?.jobDescription.trim();
    if (!prompt) {
      themedAlert.show({
        title: 'Describe the job',
        message: 'Add the job details first so AI can draft the line items.',
        icon: 'file-document-edit-outline',
      });
      return;
    }
    setAiGenerating(true);
    try {
      const result = await generateQuoteFromVoice(prompt, user?.trade || 'general', user?.hourlyRate || 85);
      setEstimateDraft({ ...result, ...calculateEstimateTotals(result.lineItems) });
    } catch (error) {
      themedAlert.show({
        title: 'AI draft failed',
        message: error instanceof Error ? error.message : 'Could not generate the estimate. You can still edit it manually.',
        icon: 'file-document-alert-outline',
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const updateEstimateField = (field: 'jobDescription' | 'notes' | 'estimatedHours', value: string) => {
    if (!estimateDraft) return;
    setEstimateDraft({
      ...estimateDraft,
      [field]: field === 'estimatedHours' ? Number(value) || 0 : value,
    });
  };

  const updateEstimateLine = (id: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => {
    if (!estimateDraft) return;
    const nextItems = estimateDraft.lineItems.map(item => {
      if (item.id !== id) return item;
      const next = {
        ...item,
        [field]: field === 'description' ? value : Number(value) || 0,
      };
      return { ...next, total: Math.round(next.quantity * next.unitPrice * 100) / 100 };
    });
    setEstimateDraft({ ...estimateDraft, lineItems: nextItems, ...calculateEstimateTotals(nextItems) });
  };

  const addEstimateLine = () => {
    if (!estimateDraft) return;
    const nextItems = [
      ...estimateDraft.lineItems,
      { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0, total: 0 },
    ];
    setEstimateDraft({ ...estimateDraft, lineItems: nextItems, ...calculateEstimateTotals(nextItems) });
  };

  const removeEstimateLine = (id: string) => {
    if (!estimateDraft) return;
    const nextItems = estimateDraft.lineItems.filter(item => item.id !== id);
    const safeItems = nextItems.length ? nextItems : [{ id: String(Date.now()), description: '', quantity: 1, unitPrice: 0, total: 0 }];
    setEstimateDraft({ ...estimateDraft, lineItems: safeItems, ...calculateEstimateTotals(safeItems) });
  };

  const ensureChatClient = () => {
    if (!conversation || !otherUserId) return '';
    addClient({
      id: otherUserId,
      name: conversation.participantName,
      phone: '',
      address: 'Address shared in chat',
      notes: conversation.subject || 'Chat customer',
      createdAt: new Date().toISOString(),
    });
    return otherUserId;
  };

  const createChatQuoteOrInvoice = async () => {
    if (!conversationId || !conversation || !createType) return;
    const estimate = estimateDraft || emptyEstimate(conversation.subject);
    const lineItems = estimate.lineItems.filter(item => item.description.trim() || item.total > 0);
    const description = estimate.jobDescription.trim() || conversation.subject || 'Service request';
    if (!description || !lineItems.some(item => item.description.trim() && item.total > 0)) {
      themedAlert.show({
        title: 'Review the draft',
        message: 'Add a scope and at least one priced line item before sending.',
        icon: 'file-document-edit-outline',
      });
      return;
    }
    const clientId = ensureChatClient();
    if (!clientId) return;
    const now = new Date().toISOString();
    const recordId = `${createType}-${Date.now()}`;
    const totals = calculateEstimateTotals(lineItems);

    if (createType === 'quote') {
      addQuote({
        id: recordId,
        clientId,
        jobDescription: description,
        lineItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: 'sent',
        notes: estimate.notes,
        validUntil: addDays(new Date(), 14).toISOString(),
        createdAt: now,
      });
      await addMessage(conversationId, `I sent a quote for "${description}".`, undefined, {
        actionType: 'quote_review',
        actionLabel: 'Sent',
        actionPayload: { quoteId: recordId, amount: totals.total },
      });
    } else {
      addInvoice({
        id: recordId,
        clientId,
        jobDescription: description,
        lineItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: 'sent',
        dueDate: addDays(new Date(), 7).toISOString(),
        notes: estimate.notes,
        createdAt: now,
        paymentTerms: 'full_upfront',
        depositPercent: 100,
        depositAmount: totals.total,
        finalAmount: 0,
        paymentStatus: 'unpaid',
      });
      await addMessage(conversationId, `I sent an invoice for "${description}".`, undefined, {
        actionType: 'invoice_payment',
        actionLabel: `Pay ${formatCurrency(totals.total)}`,
        actionPayload: { invoiceId: recordId, amount: totals.total, type: 'deposit' },
      });
    }
    closeCreateModal();
  };

  const awardJob = async (jobId: string) => {
    if (!conversationId || !conversation || !otherUserId) return;
    assignJobToPro(jobId, otherUserId, conversation.participantName);
    const job = jobs.find(item => item.id === jobId);
    await addMessage(
      conversationId,
      `I assigned you the job${job ? `: "${job.title}"` : ''}. Let's confirm the next steps here.`
    );
    setShowAwardJobs(false);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      themedAlert.show({
        title: 'Permission needed',
        message: 'Allow photo library access to send a picture.',
        icon: 'image-lock-outline',
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhoto(result.assets[0].uri);
    }
  };

  const openMessageAction = (message: typeof threadMessages[number]) => {
    if (message.actionType === 'invoice_payment' && message.actionPayload?.invoiceId) {
      router.push({
        pathname: '/payment',
        params: {
          invoiceId: message.actionPayload.invoiceId,
          type: message.actionPayload.type,
        },
      });
      return;
    }
  };

  useEffect(() => {
    void refreshCloudData();
    const timer = setInterval(() => {
      void refreshCloudData();
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshCloudData]);

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Conversation not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Avatar name={conversation.participantName} uri={conversation.participantPhoto} size={38} />
            <Text style={styles.name}>{conversation.participantName}</Text>
            <Text style={styles.subject} numberOfLines={1}>{conversation.subject || 'Conversation'}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => void refreshCloudData()}>
            <MaterialCommunityIcons name="refresh" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {(canUseProTools || canAwardJob) && (
          <View style={styles.chatTools}>
            {canUseProTools && (
              <>
                <TouchableOpacity style={styles.toolButton} onPress={() => openCreateModal('quote')}>
                  <MaterialCommunityIcons name="file-document-edit-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.toolText}>Quote</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.toolButton} onPress={() => openCreateModal('invoice')}>
                  <MaterialCommunityIcons name="receipt-text-send-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.toolText}>Invoice</Text>
                </TouchableOpacity>
              </>
            )}
            {canAwardJob && (
              <TouchableOpacity style={[styles.toolButton, styles.awardButton]} onPress={() => setShowAwardJobs(true)}>
                <MaterialCommunityIcons name="handshake-outline" size={16} color="#071210" />
                <Text style={[styles.toolText, { color: '#071210' }]}>Give Job</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
          {conversation.quoteRequested && (
            <View style={styles.systemCard}>
              <MaterialCommunityIcons name="file-document-edit-outline" size={18} color={COLORS.primary} />
              <Text style={styles.systemText}>Quote request started. Share details, photos, budget, and timing here.</Text>
            </View>
          )}
          {threadMessages.map(message => {
            const isMine = message.senderId === user?.id;
            return (
              <View key={message.id} style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
                {!isMine && <Avatar name={message.senderName} uri={conversation.participantPhoto} size={30} textSize={12} />}
                <View style={[styles.messageBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {!isMine && <Text style={styles.messageSender}>{message.senderName}</Text>}
                  {message.mediaUri ? (
                    <Image source={{ uri: message.mediaUri }} style={styles.messageImage} resizeMode="cover" />
                  ) : null}
                  {message.text && message.text !== 'Photo' ? (
                    <Text style={[styles.messageText, isMine ? styles.textMine : styles.textTheirs]}>{message.text}</Text>
                  ) : null}
                  {message.actionType ? (() => {
                    const isBookingConfirmed = message.actionType === 'booking_confirmed';
                    const isInvoice = message.actionType === 'invoice_payment';
                    const isQuoteDeclined = message.actionType === 'quote_declined';
                    const alreadyResponded = isQuoteAlreadyResponded(message.actionPayload?.quoteId);
                    const iconName = isInvoice ? 'receipt-text-check-outline'
                      : isBookingConfirmed ? 'calendar-check-outline'
                      : isQuoteDeclined ? 'file-document-remove-outline'
                      : 'file-document-check-outline';
                    const cardTitle = isInvoice ? 'Invoice ready'
                      : isBookingConfirmed ? 'Booking confirmed'
                      : isQuoteDeclined ? 'Quote declined'
                      : 'Quote';
                    const cardColor = isQuoteDeclined ? COLORS.error : COLORS.primary;
                    return (
                      <View style={[styles.actionCard, isMine ? styles.actionCardMine : styles.actionCardTheirs]}>
                        <TouchableOpacity
                          style={styles.actionCardInner}
                          activeOpacity={isInvoice ? 0.85 : 1}
                          disabled={!isInvoice}
                          onPress={() => openMessageAction(message)}
                        >
                          <View style={[styles.actionIcon, isQuoteDeclined && styles.actionIconDanger]}>
                            <MaterialCommunityIcons name={iconName} size={18} color={cardColor} />
                          </View>
                          <View style={styles.actionCopy}>
                            <Text style={styles.actionTitle}>{cardTitle}</Text>
                            {message.actionPayload?.amount ? (
                              <Text style={styles.actionAmount}>{formatCurrency(message.actionPayload.amount)}</Text>
                            ) : null}
                            {isBookingConfirmed && message.actionPayload?.address ? (
                              <Text style={styles.actionMeta} numberOfLines={1}>{message.actionPayload.address}</Text>
                            ) : null}
                            {isBookingConfirmed && message.actionPayload?.preferredDate ? (
                              <Text style={styles.actionMeta}>{message.actionPayload.preferredDate}{message.actionPayload.preferredTime ? ` at ${message.actionPayload.preferredTime}` : ''}</Text>
                            ) : null}
                            {isBookingConfirmed && message.actionPayload?.depositAmount ? (
                              <Text style={styles.actionDepositNote}>Deposit due: {formatCurrency(message.actionPayload.depositAmount)}</Text>
                            ) : null}
                          </View>
                          <View style={[styles.actionButton, isQuoteDeclined && styles.actionButtonDanger, isBookingConfirmed && styles.actionButtonSuccess]}>
                            <Text style={styles.actionButtonText}>
                              {isInvoice ? 'Pay' : isBookingConfirmed ? 'Confirmed' : isQuoteDeclined ? 'Declined' : 'Sent'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {message.actionType === 'quote_review' && !isMine && user?.role === 'customer' && (
                          alreadyResponded ? (
                            <View style={styles.quoteRespondedBanner}>
                              <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                              <Text style={styles.quoteRespondedText}>You responded to this quote</Text>
                            </View>
                          ) : (
                            <View style={styles.quoteActions}>
                              <TouchableOpacity
                                style={[styles.quoteActionBtn, styles.quoteAccept]}
                                onPress={() => openBookingFlow(
                                  message.actionPayload?.quoteId ?? '',
                                  message.actionPayload?.amount ?? 0,
                                  message.actionPayload?.depositAmount,
                                )}
                              >
                                <MaterialCommunityIcons name="check" size={14} color="#fff" />
                                <Text style={styles.quoteAcceptText}>Accept</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.quoteActionBtn, styles.quoteDecline]}
                                onPress={() => {
                                  themedAlert.show({
                                    title: 'Decline this quote?',
                                    message: 'The pro will see your decline. You can still message them to negotiate.',
                                    icon: 'close-circle-outline',
                                    actions: [
                                      {
                                        label: 'Decline',
                                        variant: 'danger',
                                        icon: 'close',
                                        onPress: () => void addMessage(conversationId, "I've declined this quote. Can we discuss adjusting the price?", undefined, {
                                          actionType: 'quote_declined',
                                          actionLabel: 'Declined',
                                          actionPayload: { quoteId: message.actionPayload?.quoteId, amount: message.actionPayload?.amount },
                                        }),
                                      },
                                      { label: 'Cancel', variant: 'ghost' },
                                    ],
                                  });
                                }}
                              >
                                <MaterialCommunityIcons name="close" size={14} color={COLORS.error} />
                                <Text style={styles.quoteDeclineText}>Decline</Text>
                              </TouchableOpacity>
                            </View>
                          )
                        )}
                      </View>
                    );
                  })() : null}
                </View>
                {isMine && <Avatar name={user?.name} uri={profilePhoto} size={30} textSize={12} />}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TouchableOpacity style={styles.attachButton} onPress={pickPhoto}>
            <MaterialCommunityIcons name="image-plus" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          {pendingPhoto ? (
            <View style={styles.pendingPhoto}>
              <Image source={{ uri: pendingPhoto }} style={styles.pendingImage} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => setPendingPhoto(null)}>
                <MaterialCommunityIcons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor={COLORS.textMuted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, (!draft.trim() && !pendingPhoto) && styles.sendButtonDisabled]} onPress={send} disabled={(!draft.trim() && !pendingPhoto) || sending}>
            <MaterialCommunityIcons name={sending ? 'timer-sand' : 'send'} size={20} color="#071210" />
          </TouchableOpacity>
        </View>
        <Modal visible={!!createType} animationType="slide" transparent onRequestClose={closeCreateModal}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeCreateModal} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{createType === 'quote' ? 'Send Quote' : 'Invoice Draft'}</Text>
                  {createType === 'quote' && (
                    <View style={styles.modalTabs}>
                      <TouchableOpacity
                        style={[styles.modalTab, modalTab === 'create' && styles.modalTabActive]}
                        onPress={() => setModalTab('create')}
                      >
                        <Text style={[styles.modalTabText, modalTab === 'create' && styles.modalTabTextActive]}>New</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalTab, modalTab === 'pick' && styles.modalTabActive]}
                        onPress={() => setModalTab('pick')}
                      >
                        <Text style={[styles.modalTabText, modalTab === 'pick' && styles.modalTabTextActive]}>My Drafts</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.modalClose} onPress={closeCreateModal}>
                  <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.estimateContent}>
                {createType === 'quote' && modalTab === 'pick' && (() => {
                  const draftQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'sent');
                  return draftQuotes.length === 0 ? (
                    <View style={styles.emptyDrafts}>
                      <MaterialCommunityIcons name="file-document-outline" size={32} color={COLORS.textMuted} />
                      <Text style={styles.emptyDraftsText}>No draft quotes yet.</Text>
                      <Text style={styles.emptyDraftsSub}>Switch to New to create one.</Text>
                    </View>
                  ) : draftQuotes.map(q => {
                    const clientName = clients.find(c => c.id === q.clientId)?.name;
                    return (
                      <TouchableOpacity key={q.id} style={styles.draftQuoteRow} onPress={() => void sendDraftQuote(q.id)}>
                        <View style={styles.draftQuoteIcon}>
                          <MaterialCommunityIcons name="file-document-check-outline" size={18} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.draftQuoteTitle} numberOfLines={1}>{q.jobDescription || 'Untitled quote'}</Text>
                          {clientName ? <Text style={styles.draftQuoteClient} numberOfLines={1}>{clientName}</Text> : null}
                        </View>
                        <Text style={styles.draftQuoteAmount}>{formatCurrency(q.total)}</Text>
                        <MaterialCommunityIcons name="send-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    );
                  });
                })()}
                {(createType !== 'quote' || modalTab === 'create') && (
                  <>
                    <Text style={styles.inputLabel}>What is the job?</Text>
                    <TextInput
                      style={[styles.modalInput, styles.promptInput]}
                      placeholder="Describe the work, materials, timing, and anything the customer mentioned..."
                      placeholderTextColor={COLORS.textMuted}
                      value={estimatePrompt}
                      onChangeText={setEstimatePrompt}
                      multiline
                    />
                    <View style={styles.estimateActions}>
                      <TouchableOpacity style={styles.aiButton} onPress={generateEstimateWithAI} disabled={aiGenerating}>
                        {aiGenerating ? (
                          <ActivityIndicator color="#071210" size="small" />
                        ) : (
                          <MaterialCommunityIcons name="auto-fix" size={16} color="#071210" />
                        )}
                        <Text style={styles.aiButtonText}>{aiGenerating ? 'Drafting...' : 'Generate with AI'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondarySmallButton} onPress={() => setEstimateDraft(emptyEstimate(conversation.subject))}>
                        <Text style={styles.secondarySmallText}>Manual</Text>
                      </TouchableOpacity>
                    </View>

                    {estimateDraft && (
                      <>
                        <Text style={styles.inputLabel}>Scope</Text>
                        <TextInput
                          style={[styles.modalInput, styles.promptInput]}
                          placeholder="Scope of work"
                          placeholderTextColor={COLORS.textMuted}
                          value={estimateDraft.jobDescription}
                          onChangeText={value => updateEstimateField('jobDescription', value)}
                          multiline
                        />
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Estimated hours"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="decimal-pad"
                          value={String(estimateDraft.estimatedHours || '')}
                          onChangeText={value => updateEstimateField('estimatedHours', value)}
                        />

                        <View style={styles.estimateSectionHeader}>
                          <Text style={styles.inputLabel}>Line items</Text>
                          <TouchableOpacity style={styles.addLineButton} onPress={addEstimateLine}>
                            <MaterialCommunityIcons name="plus" size={15} color="#071210" />
                            <Text style={styles.addLineText}>Add</Text>
                          </TouchableOpacity>
                        </View>
                        {estimateDraft.lineItems.map(item => (
                          <View key={item.id} style={styles.estimateLine}>
                            <View style={styles.estimateLineTop}>
                              <TextInput
                                style={[styles.modalInput, styles.lineDescriptionInput]}
                                placeholder="Description"
                                placeholderTextColor={COLORS.textMuted}
                                value={item.description}
                                onChangeText={value => updateEstimateLine(item.id, 'description', value)}
                              />
                              <TouchableOpacity style={styles.removeLineButton} onPress={() => removeEstimateLine(item.id)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.estimatePriceRow}>
                              <TextInput
                                style={[styles.modalInput, styles.numberInput]}
                                placeholder="Qty"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="decimal-pad"
                                value={String(item.quantity || '')}
                                onChangeText={value => updateEstimateLine(item.id, 'quantity', value)}
                              />
                              <TextInput
                                style={[styles.modalInput, styles.numberInput]}
                                placeholder="Price"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="decimal-pad"
                                value={String(item.unitPrice || '')}
                                onChangeText={value => updateEstimateLine(item.id, 'unitPrice', value)}
                              />
                              <View style={styles.lineTotalBox}>
                                <Text style={styles.lineTotalText}>{formatCurrency(item.total)}</Text>
                              </View>
                            </View>
                          </View>
                        ))}

                        <Text style={styles.inputLabel}>Notes</Text>
                        <TextInput
                          style={[styles.modalInput, styles.promptInput]}
                          placeholder="Terms, timeline, exclusions..."
                          placeholderTextColor={COLORS.textMuted}
                          value={estimateDraft.notes}
                          onChangeText={value => updateEstimateField('notes', value)}
                          multiline
                        />
                        <View style={styles.estimateTotals}>
                          <View style={styles.totalLine}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatCurrency(estimateDraft.subtotal)}</Text></View>
                          <View style={styles.totalLine}><Text style={styles.totalLabel}>Tax</Text><Text style={styles.totalValue}>{formatCurrency(estimateDraft.tax)}</Text></View>
                          <View style={styles.totalGrand}><Text style={styles.totalGrandLabel}>Total</Text><Text style={styles.totalGrandValue}>{formatCurrency(estimateDraft.total)}</Text></View>
                        </View>
                      </>
                    )}
                    <TouchableOpacity style={styles.modalPrimary} onPress={createChatQuoteOrInvoice}>
                      <Text style={styles.modalPrimaryText}>{createType === 'quote' ? 'Send Quote' : 'Send Invoice'}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showAwardJobs} animationType="slide" transparent onRequestClose={() => setShowAwardJobs(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAwardJobs(false)} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Give Job</Text>
                  <Text style={styles.modalSubtitle}>
                    {openCustomerJobs.length > 1
                      ? `Choose which open job to assign to ${conversation.participantName}.`
                      : `Assign your open job to ${conversation.participantName}.`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalClose} onPress={() => setShowAwardJobs(false)}>
                  <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {openCustomerJobs.length === 0 ? (
                <Text style={styles.emptyModalText}>You do not have any open jobs to assign right now.</Text>
              ) : openCustomerJobs.map(job => (
                <TouchableOpacity key={job.id} style={styles.jobOption} onPress={() => awardJob(job.id)}>
                  <View style={styles.jobOptionIcon}>
                    <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobOptionTitle}>{job.title}</Text>
                    <Text style={styles.jobOptionMeta}>{job.budgetRange || 'Quote needed'} - {job.urgency || job.scheduledTime}</Text>
                    <Text style={styles.jobOptionAddress} numberOfLines={1}>{job.address}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Booking questionnaire modal */}
        <Modal visible={!!bookingPayload} animationType="slide" transparent onRequestClose={closeBookingFlow}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeBookingFlow} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Confirm Your Booking</Text>
                  <Text style={styles.modalSubtitle}>Tell the pro what they need to know before starting.</Text>
                </View>
                <TouchableOpacity style={styles.modalClose} onPress={closeBookingFlow}>
                  <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.estimateContent}>
                {bookingPayload?.depositAmount ? (
                  <View style={styles.depositBanner}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.depositBannerText}>
                      A deposit of {formatCurrency(bookingPayload.depositAmount)} is required to confirm this booking.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.inputLabel}>Service address *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 12 Oak Street, Lagos"
                  placeholderTextColor={COLORS.textMuted}
                  value={bookingAddress}
                  onChangeText={setBookingAddress}
                />

                <Text style={styles.inputLabel}>Preferred date</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Saturday 28 June, or flexible"
                  placeholderTextColor={COLORS.textMuted}
                  value={bookingDate}
                  onChangeText={setBookingDate}
                />

                <Text style={styles.inputLabel}>Preferred time</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Morning, or 9 AM – 12 PM"
                  placeholderTextColor={COLORS.textMuted}
                  value={bookingTime}
                  onChangeText={setBookingTime}
                />

                <Text style={styles.inputLabel}>Access info &amp; special notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.promptInput]}
                  placeholder="Gate code, parking info, pets, materials on site, anything the pro needs to know..."
                  placeholderTextColor={COLORS.textMuted}
                  value={bookingNotes}
                  onChangeText={setBookingNotes}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.modalPrimary, bookingSubmitting && { opacity: 0.6 }]}
                  onPress={submitBooking}
                  disabled={bookingSubmitting}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator color="#071210" size="small" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>
                      {bookingPayload?.depositAmount ? 'Confirm & Proceed to Deposit' : 'Confirm Booking'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  keyboard: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center', gap: 4 },
  name: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  subject: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chatTools: { width: '100%', maxWidth: 820, alignSelf: 'center', flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  toolButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  awardButton: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toolText: { fontSize: 12, color: COLORS.primary, fontWeight: '900' },
  messages: { flex: 1 },
  messagesContent: { width: '100%', maxWidth: 820, alignSelf: 'center', padding: SPACING.lg, gap: SPACING.sm },
  systemCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '33' },
  systemText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  messageRowMine: { alignSelf: 'flex-end' },
  messageRowTheirs: { alignSelf: 'flex-start' },
  messageBubble: { maxWidth: '82%', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  messageSender: { fontSize: 11, color: COLORS.textMuted, fontWeight: '900', marginBottom: 4 },
  messageImage: { width: 210, height: 160, borderRadius: BORDER_RADIUS.md, marginBottom: 8, backgroundColor: COLORS.surfaceLight },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  textMine: { color: '#071210' },
  textTheirs: { color: COLORS.text },
  actionCard: { marginTop: SPACING.sm, minWidth: 240, borderRadius: BORDER_RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  actionCardMine: { backgroundColor: '#07121018', borderColor: '#0712102E' },
  actionCardTheirs: { backgroundColor: COLORS.background, borderColor: COLORS.border },
  actionCardInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '16' },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '900' },
  actionAmount: { marginTop: 2, fontSize: 16, color: COLORS.text, fontWeight: '900' },
  actionButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary },
  actionButtonText: { color: '#071210', fontSize: 11, fontWeight: '900' },
  actionIconDanger: { backgroundColor: COLORS.error + '16' },
  actionButtonDanger: { backgroundColor: COLORS.error + '22' },
  actionButtonSuccess: { backgroundColor: COLORS.success + '22' },
  actionMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  actionDepositNote: { fontSize: 11, color: COLORS.primary, fontWeight: '800', marginTop: 3 },
  quoteActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  quoteActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  quoteAccept: { backgroundColor: COLORS.success + '18', borderRightWidth: 1, borderRightColor: COLORS.border },
  quoteAcceptText: { color: COLORS.success, fontSize: 13, fontWeight: '800' },
  quoteDecline: { backgroundColor: COLORS.error + '10' },
  quoteDeclineText: { color: COLORS.error, fontSize: 13, fontWeight: '800' },
  quoteRespondedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  quoteRespondedText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  depositBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary + '12', borderWidth: 1, borderColor: COLORS.primary + '33', marginBottom: SPACING.md },
  depositBannerText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '700', lineHeight: 18 },
  composer: { width: '100%', maxWidth: 820, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  attachButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  pendingPhoto: { width: 46, height: 46, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  pendingImage: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, maxHeight: 120, minHeight: 46, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 14 },
  sendButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
  sendButtonDisabled: { opacity: 0.45 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' },
  modalCard: { maxHeight: '82%', padding: SPACING.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.md },
  modalTitle: { fontSize: 20, color: COLORS.text, fontWeight: '900' },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  modalTabs: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  modalTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  modalTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalTabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  modalTabTextActive: { color: '#071210' },
  emptyDrafts: { alignItems: 'center', paddingVertical: 48, gap: SPACING.sm },
  emptyDraftsText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  emptyDraftsSub: { fontSize: 13, color: COLORS.textMuted },
  draftQuoteRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  draftQuoteIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '18' },
  draftQuoteTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  draftQuoteClient: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  draftQuoteAmount: { fontSize: 15, fontWeight: '900', color: COLORS.primary, marginRight: 4 },
  modalClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  inputLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '800', marginBottom: 6 },
  modalInput: { minHeight: 48, marginBottom: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text },
  promptInput: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  estimateContent: { paddingBottom: 120 },
  estimateActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  aiButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  aiButtonText: { color: '#071210', fontSize: 13, fontWeight: '900' },
  secondarySmallButton: { minHeight: 44, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  secondarySmallText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '900' },
  estimateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addLineButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 10, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.primary },
  addLineText: { color: '#071210', fontSize: 12, fontWeight: '900' },
  estimateLine: { gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  estimateLineTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  lineDescriptionInput: { flex: 1, marginBottom: 0 },
  removeLineButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.error + '12', borderWidth: 1, borderColor: COLORS.error + '33' },
  estimatePriceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  numberInput: { flex: 1, marginBottom: 0 },
  lineTotalBox: { minWidth: 86, alignItems: 'flex-end', justifyContent: 'center' },
  lineTotalText: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  estimateTotals: { gap: 7, paddingTop: SPACING.sm, marginBottom: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  totalValue: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  totalGrand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalGrandLabel: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  totalGrandValue: { color: COLORS.success, fontSize: 19, fontWeight: '900' },
  modalPrimary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary, marginTop: SPACING.sm },
  modalPrimaryText: { color: '#071210', fontWeight: '900' },
  emptyModalText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  jobOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  jobOptionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '14', borderWidth: 1, borderColor: COLORS.primary + '33' },
  jobOptionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900' },
  jobOptionMeta: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  jobOptionAddress: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  emptyTitle: { fontSize: 18, color: COLORS.text, fontWeight: '900' },
  backButton: { paddingHorizontal: SPACING.lg, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.primary },
  backText: { color: '#071210', fontWeight: '900' },
});
