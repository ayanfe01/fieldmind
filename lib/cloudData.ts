import { supabase } from './supabase';
import { ChatMessage, Client, Conversation, Invoice, Job, Quote, User } from './types';
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
  profilePhoto: string | null;
}

const logCloudError = (action: string, error: unknown) => {
  if (error) {
    console.warn(`[FieldMind cloud] ${action} failed`, error);
  }
};

const withoutUndefined = <T extends Record<string, unknown>>(input: T) => (
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T
);

export const upsertProfile = async (user: User, profilePhoto?: string | null) => {
  const { error } = await supabase.from('profiles').upsert(withoutUndefined({
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    business_name: user.businessName,
    trade: user.trade,
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
  const [
    clientsResult,
    quotesResult,
    invoicesResult,
    jobsResult,
    withdrawalsResult,
    portfolioResult,
    conversationsResult,
    messagesResult,
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
    supabase.from('profiles').select('profile_photo').maybeSingle(),
  ]);

  logCloudError('fetch clients', clientsResult.error);
  logCloudError('fetch quotes', quotesResult.error);
  logCloudError('fetch invoices', invoicesResult.error);
  logCloudError('fetch jobs', jobsResult.error);
  logCloudError('fetch withdrawals', withdrawalsResult.error);
  logCloudError('fetch portfolio', portfolioResult.error);
  logCloudError('fetch conversations', conversationsResult.error);
  logCloudError('fetch messages', messagesResult.error);
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
      notes: row.notes || undefined,
      createdAt: row.created_at,
      customerMedia: row.customer_media || undefined,
      completionMedia: row.completion_media || undefined,
      escrowStatus: row.escrow_status || undefined,
      customerVerifiedAt: row.customer_verified_at || undefined,
      paymentMethod: row.payment_method || undefined,
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
      participantId: row.participant_id,
      participantName: row.participant_name,
      participantRole: row.participant_role,
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
      createdAt: row.created_at,
    })),
    profilePhoto: profileResult.data?.profile_photo || null,
  };
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

export const saveJob = async (ownerId: string, job: Job) => {
  const { error } = await supabase.from('jobs').upsert(withoutUndefined({
    id: job.id,
    owner_id: ownerId,
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
    notes: job.notes,
    customer_media: job.customerMedia || [],
    completion_media: job.completionMedia || [],
    escrow_status: job.escrowStatus,
    customer_verified_at: job.customerVerifiedAt,
    payment_method: job.paymentMethod,
    created_at: job.createdAt,
  }));
  logCloudError('save job', error);
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
  const { error } = await supabase.from('conversations').upsert(withoutUndefined({
    id: conversation.id,
    owner_id: ownerId,
    participant_id: conversation.participantId,
    participant_name: conversation.participantName,
    participant_role: conversation.participantRole,
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
    created_at: message.createdAt,
  });
  logCloudError('save message', error);
};

export const deleteCloudRow = async (table: 'clients' | 'quotes' | 'invoices' | 'jobs' | 'withdrawals' | 'portfolio_items' | 'conversations' | 'messages', id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  logCloudError(`delete ${table}`, error);
};
