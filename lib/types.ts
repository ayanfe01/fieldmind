export type TradeType =
  | 'plumber'
  | 'electrician'
  | 'hvac'
  | 'carpenter'
  | 'painter'
  | 'roofer'
  | 'landscaper'
  | 'engineer'
  | 'hairstylist'
  | 'tailor'
  | 'cobbler'
  | 'cleaner'
  | 'mechanic'
  | 'makeup_artist'
  | 'photographer'
  | 'general';
export type UserRole = 'tradesperson' | 'customer' | 'admin';
export type PropertyType = 'home' | 'apartment' | 'office' | 'commercial' | 'rental';
export type PricingMode = 'hourly' | 'fixed' | 'quote';

export interface User {
  id: string;
  role: UserRole;
  roles?: UserRole[];
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  // Tradesperson fields
  trade?: TradeType;
  trades?: TradeType[];
  customTrade?: string;
  businessName?: string;
  hourlyRate?: number;
  fixedRate?: number;
  pricingMode?: PricingMode;
  yearsExperience?: number;
  serviceArea?: string;
  licenseNumber?: string;
  bio?: string;
  // Customer fields
  propertyAddress?: string;
  propertyType?: PropertyType;
}

export interface Client {
  id: string; name: string; phone: string; email?: string;
  address: string; notes?: string; createdAt: string;
}

export interface LineItem {
  id: string; description: string; quantity: number; unitPrice: number; total: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentTermsType = 'full_after' | 'split_50_50' | 'full_upfront' | 'custom';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid';

export interface Quote {
  id: string; clientId: string; client?: Client; jobDescription: string;
  lineItems: LineItem[]; subtotal: number; tax: number; total: number;
  status: QuoteStatus; notes?: string; validUntil: string; createdAt: string;
  paymentTerms?: PaymentTermsType;
  depositPercent?: number;
  // Public share link (quote-link edge function)
  shareToken?: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  signedName?: string;
}

export interface Invoice {
  id: string; quoteId?: string; clientId: string; client?: Client; jobDescription: string;
  lineItems: LineItem[]; subtotal: number; tax: number; total: number;
  status: InvoiceStatus; dueDate: string; paidAt?: string; notes?: string; createdAt: string;
  paymentTerms?: PaymentTermsType;
  depositPercent?: number;
  depositAmount?: number;
  finalAmount?: number;
  depositPaidAt?: string;
  depositPaymentIntentId?: string;
  finalPaymentIntentId?: string;
  paymentStatus?: PaymentStatus;
}

export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  caption?: string;
  uploadedAt: string;
}

export type EscrowStatus = 'holding' | 'released' | 'disputed';

export interface Job {
  id: string; ownerId?: string; clientId: string; client?: Client; title: string; description: string;
  scheduledDate: string; scheduledTime: string; estimatedHours: number;
  status: JobStatus; address: string; quoteId?: string; invoiceId?: string;
  assignedProId?: string;
  assignedProName?: string;
  assignedAt?: string;
  category?: TradeType;
  customCategory?: string;
  budgetRange?: string;
  urgency?: string;
  notes?: string; createdAt: string;
  completedAt?: string;
  invoiceSentAt?: string;
  customerMedia?: MediaItem[];
  completionMedia?: MediaItem[];
  escrowStatus?: EscrowStatus;
  customerVerifiedAt?: string;
  paymentMethod?: 'stripe' | 'cash';
}

export interface Rating {
  id: string;
  jobId: string;
  invoiceId?: string;
  raterId: string;      // who left the rating
  raterName: string;
  ratedUserId: string;  // who received the rating (pro's userId)
  stars: number;        // 1–5
  review?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  ownerId?: string;
  initiatorName?: string;
  initiatorPhoto?: string | null;
  participantId: string;
  participantName: string;
  participantPhoto?: string | null;
  participantRole: UserRole;
  participantUserIds?: string[];
  jobId?: string;
  subject?: string;
  quoteRequested?: boolean;
  lastMessage?: string;
  updatedAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaUri?: string;
  mediaType?: 'image';
  actionType?: 'invoice_payment' | 'quote_review' | 'booking_confirmed' | 'quote_declined';
  actionLabel?: string;
  actionPayload?: {
    invoiceId?: string;
    quoteId?: string;
    amount?: number;
    depositAmount?: number;
    depositPercent?: number;
    type?: 'deposit' | 'final';
    address?: string;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
  };
  createdAt: string;
}

export interface DashboardStats {
  totalEarningsMonth: number; pendingInvoices: number; scheduledJobs: number; activeQuotes: number;
}
