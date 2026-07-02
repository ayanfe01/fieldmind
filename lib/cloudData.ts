import { supabase } from './supabase';
import { ChatMessage, Client, Conversation, Invoice, Job, Quote, Rating, User } from './types';
import type { PortfolioItem, WithdrawalRecord } from '../store/useAppStore';

export interface CloudState {
  clients: Client[];
  quotes: Quote[];
  invoices: Invoice[];
  jobs: Job[];
  withdrawals: WithdrawalRecord[];
  portfolioItems: PortfolioItem[];
  conversations: Conversation[];
  messages: ChatMessage[];
  ratings: Rating[];
  profilePhoto: string | null;
}

export interface PublicServicePro {
  id: string;
  name: string;
  businessName?: string;
  trade?: string;
  trades?: string[];
  customTrade?: string;
  pricingMode?: string;
  hourlyRate?: number;
  fixedRate?: number;
  yearsExperience?: number;
  serviceArea?: string;
  bio?: string;
  profilePhoto?: string | null;
}

const logCloudError = (action: string, error: unknown) => {
  if (error) {
    console.warn(`[FieldMind cloud] ${action} failed`, error);
  }
};

const withoutUndefined = <T extends Record<string, unknown>>(input: T) => (
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T
);

const localUriToBlob = (uri: string) => new Promise<Blob>((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.onload = () => resolve(xhr.response);
  xhr.onerror = () => reject(new Error('Could not read the selected image from this device.'));
  xhr.responseType = 'blob';
  xhr.open('GET', uri);
  xhr.send();
});

export const uploadProfilePhoto = async (userId: string, uri: string) => {
  if (/^https?:\/\//i.test(uri)) return uri;

  const blob = await localUriToBlob(uri);
  const mimeType = blob.type || 'image/jpeg';
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/profile.${extension}`;

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
};

export const uploadChatImage = async (userId: string, uri: string) => {
  if (/^https?:\/\//i.test(uri)) return uri;

  const blob = await localUriToBlob(uri);
  const mimeType = blob.type || 'image/jpeg';
  const extension = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, blob, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('chat-attachments').getPublicUrl(path);
  return data.publicUrl;
};

export const upsertProfile = async (user: User, profilePhoto?: string | null) => {
  const { error } = await supabase.from('profiles').upsert(withoutUndefined({
    id: user.id,
    role: user.role,
    roles: user.roles?.length ? user.roles : [user.role],
    name: user.name,
    email: user.email,
    phone: user.phone,
    business_name: user.businessName,
    trade: user.trade,
    trades: user.trades,
    custom_trade: user.customTrade,
    pricing_mode: user.pricingMode,
    hourly_rate: user.hourlyRate,
    fixed_rate: user.fixedRate,
    years_experience: user.yearsExperience,
    service_area: user.serviceArea,
    license_number: user.licenseNumber,
    bio: user.bio,
    property_address: user.propertyAddress,
    property_type: user.propertyType,
    profile_photo: profilePhoto,
    created_at: user.createdAt,
  }));
  logCloudError('upsert profile', error);
};

export const fetchCloudState = async (): Promise<Partial<CloudState>> => {
  const currentUserId = (await supabase.auth.getUser()).data.user?.id;
  const [
    clientsResult,
    quotesResult,
    invoicesResult,
    jobsResult,
    withdrawalsResult,
    portfolioResult,
    conversationsResult,
    messagesResult,
    ratingsResult,
    profileResult,
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('quotes').select('*').order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
    supabase.from('portfolio_items').select('*').order('created_at', { ascending: false }),
    supabase.from('conversations').select('*').order('updated_at', { ascending: false }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    supabase.from('ratings').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('profile_photo').eq('id', currentUserId || '').maybeSingle(),
  ]);

  logCloudError('fetch clients', clientsResult.error);
  logCloudError('fetch quotes', quotesResult.error);
  logCloudError('fetch invoices', invoicesResult.error);
  logCloudError('fetch jobs', jobsResult.error);
  logCloudError('fetch withdrawals', withdrawalsResult.error);
  logCloudError('fetch portfolio', portfolioResult.error);
  logCloudError('fetch conversations', conversationsResult.error);
  logCloudError('fetch messages', messagesResult.error);
  logCloudError('fetch ratings', ratingsResult.error);
  logCloudError('fetch profile', profileResult.error);

  return {
    clients: (clientsResult.data || []).map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      address: row.address,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    })),
    quotes: (quotesResult.data || []).map(row => ({
      id: row.id,
      clientId: row.client_id,
      jobDescription: row.job_description,
      lineItems: row.line_items || [],
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
      status: row.status,
      notes: row.notes || undefined,
      validUntil: row.valid_until,
      createdAt: row.created_at,
      paymentTerms: row.payment_terms || undefined,
      depositPercent: row.deposit_percent == null ? undefined : Number(row.deposit_percent),
      shareToken: row.share_token || undefined,
      sentAt: row.sent_at || undefined,
      viewedAt: row.viewed_at || undefined,
      acceptedAt: row.accepted_at || undefined,
      declinedAt: row.declined_at || undefined,
      signedName: row.signed_name || undefined,
    })),
    invoices: (invoicesResult.data || []).map(row => ({
      id: row.id,
      quoteId: row.quote_id || undefined,
      clientId: row.client_id,
      jobDescription: row.job_description,
      lineItems: row.line_items || [],
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
      status: row.status,
      dueDate: row.due_date,
      paidAt: row.paid_at || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      paymentTerms: row.payment_terms || undefined,
      depositPercent: row.deposit_percent == null ? undefined : Number(row.deposit_percent),
      depositAmount: row.deposit_amount == null ? undefined : Number(row.deposit_amount),
      finalAmount: row.final_amount == null ? undefined : Number(row.final_amount),
      depositPaidAt: row.deposit_paid_at || undefined,
      depositPaymentIntentId: row.deposit_payment_intent_id || undefined,
      finalPaymentIntentId: row.final_payment_intent_id || undefined,
      paymentStatus: row.payment_status || undefined,
    })),
    jobs: (jobsResult.data || []).map(row => ({
      id: row.id,
      ownerId: row.owner_id,
      clientId: row.client_id,
      title: row.title,
      description: row.description,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      estimatedHours: Number(row.estimated_hours || 0),
      status: row.status,
      address: row.address,
      quoteId: row.quote_id || undefined,
      invoiceId: row.invoice_id || undefined,
      assignedProId: row.assigned_pro_id || undefined,
      assignedProName: row.assigned_pro_name || undefined,
      assignedAt: row.assigned_at || undefined,
      category: row.category || undefined,
      customCategory: row.custom_category || undefined,
      budgetRange: row.budget_range || undefined,
      urgency: row.urgency || undefined,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      customerMedia: row.customer_media || undefined,
      completionMedia: row.completion_media || undefined,
      escrowStatus: row.escrow_status || undefined,
      customerVerifiedAt: row.customer_verified_at || undefined,
      paymentMethod: row.payment_method || undefined,
      completedAt: row.completed_at || undefined,
      invoiceSentAt: row.invoice_sent_at || undefined,
    })),
    withdrawals: (withdrawalsResult.data || []).map(row => ({
      id: row.id,
      amount: Number(row.amount || 0),
      status: row.status,
      bankLast4: row.bank_last4,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    })),
    portfolioItems: (portfolioResult.data || []).map(row => ({
      id: row.id,
      uri: row.uri,
      caption: row.caption || '',
      createdAt: row.created_at,
    })),
    conversations: (conversationsResult.data || []).map(row => ({
      id: row.id,
      ownerId: row.owner_id,
      initiatorName: row.initiator_name || undefined,
      initiatorPhoto: row.initiator_photo || null,
      participantId: row.owner_id === currentUserId ? row.participant_id : row.owner_id,
      participantName: row.owner_id === currentUserId ? row.participant_name : (row.initiator_name || 'FieldMind User'),
      participantPhoto: row.owner_id === currentUserId ? (row.participant_photo || null) : (row.initiator_photo || null),
      participantRole: row.participant_role,
      participantUserIds: row.participant_user_ids || undefined,
      jobId: row.job_id || undefined,
      subject: row.subject || undefined,
      quoteRequested: row.quote_requested,
      lastMessage: row.last_message || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    messages: (messagesResult.data || []).map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      text: row.text,
      mediaUri: row.media_uri || undefined,
      mediaType: row.media_type || undefined,
      actionType: row.action_type || undefined,
      actionLabel: row.action_label || undefined,
      actionPayload: row.action_payload || undefined,
      createdAt: row.created_at,
    })),
    ratings: (ratingsResult.data || []).map(row => ({
      id: row.id,
      jobId: row.job_id,
      invoiceId: row.invoice_id || undefined,
      raterId: row.rater_id,
      raterName: row.rater_name,
      ratedUserId: row.rated_user_id,
      stars: Number(row.stars),
      review: row.review || undefined,
      createdAt: row.created_at,
    })),
    profilePhoto: profileResult.data?.profile_photo || null,
  };
};

export const fetchPublicServicePros = async (): Promise<PublicServicePro[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,business_name,trade,trades,custom_trade,pricing_mode,hourly_rate,fixed_rate,years_experience,service_area,bio,profile_photo')
    .contains('roles', ['tradesperson'])
    .order('updated_at', { ascending: false });

  logCloudError('fetch service pros', error);

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    businessName: row.business_name || undefined,
    trade: row.trade || undefined,
    trades: row.trades || undefined,
    customTrade: row.custom_trade || undefined,
    pricingMode: row.pricing_mode || undefined,
    hourlyRate: row.hourly_rate == null ? undefined : Number(row.hourly_rate),
    fixedRate: row.fixed_rate == null ? undefined : Number(row.fixed_rate),
    yearsExperience: row.years_experience == null ? undefined : Number(row.years_experience),
    serviceArea: row.service_area || undefined,
    bio: row.bio || undefined,
    profilePhoto: row.profile_photo || null,
  }));
};

export const saveClient = async (ownerId: string, client: Client) => {
  const { error } = await supabase.from('clients').upsert(withoutUndefined({
    id: client.id,
    owner_id: ownerId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    created_at: client.createdAt,
  }));
  logCloudError('save client', error);
};

export const saveQuote = async (ownerId: string, quote: Quote) => {
  const { error } = await supabase.from('quotes').upsert(withoutUndefined({
    id: quote.id,
    owner_id: ownerId,
    client_id: quote.clientId,
    job_description: quote.jobDescription,
    line_items: quote.lineItems,
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
    status: quote.status,
    notes: quote.notes,
    valid_until: quote.validUntil,
    payment_terms: quote.paymentTerms,
    deposit_percent: quote.depositPercent,
    share_token: quote.shareToken,
    sent_at: quote.sentAt,
    viewed_at: quote.viewedAt,
    accepted_at: quote.acceptedAt,
    declined_at: quote.declinedAt,
    signed_name: quote.signedName,
    created_at: quote.createdAt,
  }));
  logCloudError('save quote', error);
};

export const saveInvoice = async (ownerId: string, invoice: Invoice) => {
  const { error } = await supabase.from('invoices').upsert(withoutUndefined({
    id: invoice.id,
    owner_id: ownerId,
    quote_id: invoice.quoteId,
    client_id: invoice.clientId,
    job_description: invoice.jobDescription,
    line_items: invoice.lineItems,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    status: invoice.status,
    due_date: invoice.dueDate,
    paid_at: invoice.paidAt,
    notes: invoice.notes,
    payment_terms: invoice.paymentTerms,
    deposit_percent: invoice.depositPercent,
    deposit_amount: invoice.depositAmount,
    final_amount: invoice.finalAmount,
    deposit_paid_at: invoice.depositPaidAt,
    deposit_payment_intent_id: invoice.depositPaymentIntentId,
    final_payment_intent_id: invoice.finalPaymentIntentId,
    payment_status: invoice.paymentStatus,
    created_at: invoice.createdAt,
  }));
  logCloudError('save invoice', error);
};

// Update ONLY payment-related fields on an invoice.
// Uses .update() (not upsert) so it never changes owner_id.
// This is used by customers after paying so the pro's invoice reflects the payment.
export const recordInvoicePayment = async (invoiceId: string, fields: {
  paidAt?: string;
  depositPaidAt?: string;
  depositPaymentIntentId?: string;
  finalPaymentIntentId?: string;
  paymentStatus?: string;
  status?: string;
}) => {
  const { error } = await supabase.from('invoices')
    .update(withoutUndefined({
      paid_at: fields.paidAt,
      deposit_paid_at: fields.depositPaidAt,
      deposit_payment_intent_id: fields.depositPaymentIntentId,
      final_payment_intent_id: fields.finalPaymentIntentId,
      payment_status: fields.paymentStatus,
      status: fields.status,
    }))
    .eq('id', invoiceId);
  logCloudError('record invoice payment', error);
};

export const saveJob = async (ownerId: string, job: Job) => {
  const { error } = await supabase.from('jobs').upsert(withoutUndefined({
    id: job.id,
    owner_id: job.ownerId || ownerId,
    client_id: job.clientId,
    title: job.title,
    description: job.description,
    scheduled_date: job.scheduledDate,
    scheduled_time: job.scheduledTime,
    estimated_hours: job.estimatedHours,
    status: job.status,
    address: job.address,
    quote_id: job.quoteId,
    invoice_id: job.invoiceId,
    assigned_pro_id: job.assignedProId,
    assigned_pro_name: job.assignedProName,
    assigned_at: job.assignedAt,
    category: job.category,
    custom_category: job.customCategory,
    budget_range: job.budgetRange,
    urgency: job.urgency,
    notes: job.notes,
    customer_media: job.customerMedia || [],
    completion_media: job.completionMedia || [],
    escrow_status: job.escrowStatus,
    customer_verified_at: job.customerVerifiedAt,
    payment_method: job.paymentMethod,
    completed_at: job.completedAt,
    invoice_sent_at: job.invoiceSentAt,
    created_at: job.createdAt,
  }));
  logCloudError('save job', error);
};

export const saveRating = async (rating: Rating) => {
  const { error } = await supabase.from('ratings').upsert(withoutUndefined({
    id: rating.id,
    job_id: rating.jobId,
    invoice_id: rating.invoiceId,
    rater_id: rating.raterId,
    rater_name: rating.raterName,
    rated_user_id: rating.ratedUserId,
    stars: rating.stars,
    review: rating.review,
    created_at: rating.createdAt,
  }));
  logCloudError('save rating', error);
};

export const saveWithdrawal = async (ownerId: string, withdrawal: WithdrawalRecord) => {
  const { error } = await supabase.from('withdrawals').upsert({
    id: withdrawal.id,
    owner_id: ownerId,
    amount: withdrawal.amount,
    status: withdrawal.status,
    bank_last4: withdrawal.bankLast4,
    completed_at: withdrawal.completedAt,
    created_at: withdrawal.createdAt,
  });
  logCloudError('save withdrawal', error);
};

export const savePortfolioItem = async (ownerId: string, item: PortfolioItem) => {
  const { error } = await supabase.from('portfolio_items').upsert({
    id: item.id,
    owner_id: ownerId,
    uri: item.uri,
    caption: item.caption,
    created_at: item.createdAt,
  });
  logCloudError('save portfolio item', error);
};

export const saveConversation = async (ownerId: string, conversation: Conversation) => {
  const owningUserId = conversation.ownerId || ownerId;
  const { error } = await supabase.from('conversations').upsert(withoutUndefined({
    id: conversation.id,
    owner_id: owningUserId,
    initiator_name: conversation.initiatorName,
    initiator_photo: conversation.initiatorPhoto,
    participant_id: conversation.participantId,
    participant_name: conversation.participantName,
    participant_photo: conversation.participantPhoto,
    participant_role: conversation.participantRole,
    participant_user_ids: conversation.participantUserIds?.length ? conversation.participantUserIds : [owningUserId],
    job_id: conversation.jobId,
    subject: conversation.subject,
    quote_requested: conversation.quoteRequested || false,
    last_message: conversation.lastMessage,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  }));
  logCloudError('save conversation', error);
};

export const saveMessage = async (ownerId: string, message: ChatMessage) => {
  const { error } = await supabase.from('messages').upsert({
    id: message.id,
    owner_id: ownerId,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    text: message.text,
    media_uri: message.mediaUri,
    media_type: message.mediaType,
    action_type: message.actionType,
    action_label: message.actionLabel,
    action_payload: message.actionPayload,
    created_at: message.createdAt,
  });
  logCloudError('save message', error);
};

export const deleteCloudRow = async (table: 'clients' | 'quotes' | 'invoices' | 'jobs' | 'withdrawals' | 'portfolio_items' | 'conversations' | 'messages', id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  logCloudError(`delete ${table}`, error);
};
