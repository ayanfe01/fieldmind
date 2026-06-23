import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User as SupabaseAuthUser } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import {
  deleteCloudRow,
  fetchCloudState,
  saveClient,
  saveInvoice,
  saveJob,
  saveConversation,
  saveMessage,
  savePortfolioItem,
  saveQuote,
  saveWithdrawal,
  uploadChatImage,
  uploadProfilePhoto,
  upsertProfile,
} from '../lib/cloudData';
import { User, UserRole, TradeType, PropertyType, PricingMode, Client, Quote, Invoice, Job, DashboardStats, Conversation, ChatMessage } from '../lib/types';

WebBrowser.maybeCompleteAuthSession();

export interface PortfolioItem {
  id: string;
  uri: string;
  caption: string;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  bankLast4: string;
  createdAt: string;
  completedAt?: string;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: User;
  requiresEmailConfirmation?: boolean;
}

const EXISTING_ACCOUNT_MESSAGE = 'An account already exists with this email. Please log in instead.';

const isExistingAccountError = (message?: string) => {
  const normalized = (message || '').toLowerCase();
  return normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists');
};

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  authInitialized: boolean;
  clients: Client[];
  quotes: Quote[];
  invoices: Invoice[];
  jobs: Job[];
  conversations: Conversation[];
  messages: ChatMessage[];
  withdrawals: WithdrawalRecord[];
  availableBalance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  profilePhoto: string | null;
  portfolioItems: PortfolioItem[];
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (val: boolean) => void;
  setActiveRole: (role: Exclude<UserRole, 'admin'>) => Promise<AuthResult>;
  addAccountRole: (role: Exclude<UserRole, 'admin'>) => Promise<AuthResult>;
  syncAuthUser: (authUser: SupabaseAuthUser | null) => void;
  initializeAuth: () => Promise<void>;
  refreshCloudData: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  resendEmailConfirmation: (email: string) => Promise<AuthResult>;
  registerUser: (user: User, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  setProfilePhoto: (uri: string) => Promise<void>;
  addPortfolioItem: (item: PortfolioItem) => void;
  removePortfolioItem: (id: string) => void;
  addClient: (client: Client) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  assignJobToPro: (jobId: string, proId: string, proName: string) => void;
  startConversation: (input: { participantId: string; participantName: string; participantRole: UserRole; participantUserId?: string; participantPhoto?: string | null; jobId?: string; subject?: string; quoteRequested?: boolean; initialMessage?: string }) => string;
  addMessage: (conversationId: string, text: string, attachment?: { uri: string; type: 'image' }, action?: Pick<ChatMessage, 'actionType' | 'actionLabel' | 'actionPayload'>) => Promise<void>;
  deleteConversation: (id: string) => void;
  getDashboardStats: () => DashboardStats;
  setLoading: (val: boolean) => void;
  requestWithdrawal: (amount: number, bankLast4: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const isUuid = (value?: string) => !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const getOAuthRedirectUrl = () => Linking.createURL('auth/callback');
const getPasswordResetRedirectUrl = () => Linking.createURL('auth/reset-password');

const validRoles: UserRole[] = ['tradesperson', 'customer', 'admin'];
const validTrades: TradeType[] = ['plumber', 'electrician', 'hvac', 'carpenter', 'painter', 'roofer', 'landscaper', 'engineer', 'hairstylist', 'tailor', 'cobbler', 'cleaner', 'mechanic', 'makeup_artist', 'photographer', 'general'];
const validPropertyTypes: PropertyType[] = ['home', 'apartment', 'office', 'commercial', 'rental'];
const validPricingModes: PricingMode[] = ['hourly', 'fixed', 'quote'];

const toUserRole = (role: unknown): UserRole => (
  typeof role === 'string' && validRoles.includes(role as UserRole) ? role as UserRole : 'customer'
);

const toUserRoles = (roles: unknown, fallback: UserRole): UserRole[] => {
  const normalized = Array.isArray(roles)
    ? roles.filter((role): role is UserRole => typeof role === 'string' && validRoles.includes(role as UserRole))
    : [];
  const withFallback = normalized.length > 0 ? normalized : [fallback];
  return Array.from(new Set(withFallback));
};

const toTradeType = (trade: unknown): TradeType | undefined => (
  typeof trade === 'string' && validTrades.includes(trade as TradeType) ? trade as TradeType : undefined
);

const toPropertyType = (propertyType: unknown): PropertyType | undefined => (
  typeof propertyType === 'string' && validPropertyTypes.includes(propertyType as PropertyType) ? propertyType as PropertyType : undefined
);

const toPricingMode = (pricingMode: unknown): PricingMode => (
  typeof pricingMode === 'string' && validPricingModes.includes(pricingMode as PricingMode) ? pricingMode as PricingMode : 'quote'
);

const getFirstString = (...values: unknown[]) => {
  const value = values.find(item => typeof item === 'string' && item.trim().length > 0);
  return typeof value === 'string' ? value : undefined;
};

const mapSupabaseUser = (authUser: SupabaseAuthUser): User => {
  const metadata = authUser.user_metadata || {};
  const role = toUserRole(metadata.role);
  const roles = toUserRoles(metadata.roles, role);
  const displayName = getFirstString(metadata.name, metadata.full_name, metadata.display_name, authUser.email?.split('@')[0]);
  const user: User = {
    id: authUser.id,
    role,
    roles,
    name: displayName || 'FieldMind User',
    email: authUser.email || '',
    phone: typeof metadata.phone === 'string' ? metadata.phone : '',
    createdAt: authUser.created_at || new Date().toISOString(),
  };

  if (roles.includes('tradesperson')) {
    user.businessName = typeof metadata.businessName === 'string' ? metadata.businessName : undefined;
    user.trade = toTradeType(metadata.trade) || 'general';
    user.trades = Array.isArray(metadata.trades)
      ? metadata.trades.filter((trade): trade is TradeType => typeof trade === 'string' && validTrades.includes(trade as TradeType))
      : [user.trade];
    user.customTrade = typeof metadata.customTrade === 'string' ? metadata.customTrade : undefined;
    user.pricingMode = toPricingMode(metadata.pricingMode);
    user.hourlyRate = typeof metadata.hourlyRate === 'number' ? metadata.hourlyRate : undefined;
    user.fixedRate = typeof metadata.fixedRate === 'number' ? metadata.fixedRate : undefined;
    user.yearsExperience = typeof metadata.yearsExperience === 'number' ? metadata.yearsExperience : undefined;
    user.serviceArea = typeof metadata.serviceArea === 'string' ? metadata.serviceArea : undefined;
    user.licenseNumber = typeof metadata.licenseNumber === 'string' ? metadata.licenseNumber : undefined;
    user.bio = typeof metadata.bio === 'string' ? metadata.bio : undefined;
  }

  if (roles.includes('customer')) {
    user.propertyAddress = typeof metadata.propertyAddress === 'string' ? metadata.propertyAddress : undefined;
    user.propertyType = toPropertyType(metadata.propertyType);
  }

  return user;
};

const userToAuthMetadata = (user: User) => ({
  role: user.role,
  roles: user.roles?.length ? user.roles : [user.role],
  name: user.name,
  phone: user.phone,
  businessName: user.businessName,
  trade: user.trade,
  trades: user.trades,
  customTrade: user.customTrade,
  pricingMode: user.pricingMode,
  hourlyRate: user.hourlyRate,
  fixedRate: user.fixedRate,
  yearsExperience: user.yearsExperience,
  serviceArea: user.serviceArea,
  licenseNumber: user.licenseNumber,
  bio: user.bio,
  propertyAddress: user.propertyAddress,
  propertyType: user.propertyType,
});

const authResultFromSessionUrl = async (url: string) => {
  const parsedUrl = new URL(url.replace('#', '?'));
  const errorDescription = parsedUrl.searchParams.get('error_description');
  const error = parsedUrl.searchParams.get('error');
  const code = parsedUrl.searchParams.get('code');
  const accessToken = parsedUrl.searchParams.get('access_token');
  const refreshToken = parsedUrl.searchParams.get('refresh_token');

  if (errorDescription || error) {
    return { data: null, error: { message: errorDescription || error || 'Google login failed.' } };
  }

  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }

  if (accessToken && refreshToken) {
    return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  return { data: null, error: { message: 'Google login did not return a valid session.' } };
};

const emptyUserData = {
  clients: [],
  quotes: [],
  invoices: [],
  jobs: [],
  conversations: [],
  messages: [],
  withdrawals: [],
  availableBalance: 0,
  pendingBalance: 0,
  totalWithdrawn: 0,
  profilePhoto: null,
  portfolioItems: [],
};

const conversationKey = (conversation: Conversation, currentUserId: string) => {
  const ids = Array.from(new Set([
    currentUserId,
    ...(conversation.participantUserIds || []),
    conversation.ownerId,
    conversation.participantId,
  ].filter((value): value is string => !!value && isUuid(value)))).sort();
  if (ids.length >= 2) return `users:${ids.join(':')}`;
  return `legacy:${conversation.ownerId || currentUserId}:${conversation.participantId}:${conversation.participantRole}:${conversation.participantName}`;
};

const dedupeConversations = (state: Partial<AppState>, currentUserId: string): Partial<AppState> => {
  const idMap = new Map<string, string>();
  const byKey = new Map<string, Conversation>();

  (state.conversations || []).forEach(conversation => {
    const key = conversationKey(conversation, currentUserId);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, conversation);
      return;
    }

    const existingDate = new Date(existing.updatedAt).getTime();
    const nextDate = new Date(conversation.updatedAt).getTime();
    const primary = nextDate > existingDate ? conversation : existing;
    const duplicate = primary.id === existing.id ? conversation : existing;
    const merged: Conversation = {
      ...primary,
      participantUserIds: Array.from(new Set([
        ...(existing.participantUserIds || []),
        ...(conversation.participantUserIds || []),
      ])),
      jobId: primary.jobId || duplicate.jobId,
      quoteRequested: primary.quoteRequested || duplicate.quoteRequested,
      subject: primary.subject || duplicate.subject,
      lastMessage: primary.lastMessage || duplicate.lastMessage,
    };
    byKey.set(key, merged);
    idMap.set(duplicate.id, primary.id);
  });

  const conversations = Array.from(byKey.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const messages = (state.messages || []).map(message => ({
    ...message,
    conversationId: idMap.get(message.conversationId) || message.conversationId,
  }));

  return { ...state, conversations, messages };
};

const loadCloudData = async (setState: (state: Partial<AppState>) => void, user: User) => {
  await upsertProfile(user);
  const cloudState = await fetchCloudState();
  setState(dedupeConversations(cloudState, user.id));
};

const relatedJobPaymentUpdates = (job: Job, invoice: Invoice): Partial<Job> => {
  if (invoice.paymentStatus === 'fully_paid' || invoice.status === 'paid') {
    return {
      paymentMethod: 'stripe',
      escrowStatus: job.status === 'completed' ? 'released' : 'holding',
      customerVerifiedAt: job.status === 'completed' ? (job.customerVerifiedAt || invoice.paidAt || new Date().toISOString()) : job.customerVerifiedAt,
    };
  }

  if (invoice.paymentStatus === 'deposit_paid') {
    return {
      paymentMethod: 'stripe',
      escrowStatus: 'holding',
    };
  }

  return {};
};

export const useAppStore = create<AppState>()(persist((set, get) => ({
  user: null,
  isAuthenticated: false,
  authInitialized: false,
  clients: [],
  quotes: [],
  invoices: [],
  jobs: [],
  conversations: [],
  messages: [],
  withdrawals: [],
  availableBalance: 0,
  pendingBalance: 0,
  totalWithdrawn: 0,
  profilePhoto: null,
  portfolioItems: [],
  isLoading: false,

  setUser: (user) => set({ user }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setActiveRole: async (role) => {
    const user = get().user;
    if (!user) return { success: false, message: 'You need to be logged in first.' };
    const roles = Array.from(new Set([...(user.roles || [user.role]), role]));
    const nextUser = { ...user, role, roles };
    const { data, error } = await supabase.auth.updateUser({
      data: userToAuthMetadata(nextUser),
    });
    if (error) return { success: false, message: error.message };
    const mappedUser = data.user ? mapSupabaseUser(data.user) : nextUser;
    set({ user: mappedUser });
    await upsertProfile(mappedUser, get().profilePhoto);
    return { success: true, user: mappedUser };
  },
  addAccountRole: async (role) => {
    const user = get().user;
    if (!user) return { success: false, message: 'You need to be logged in first.' };
    const roles = Array.from(new Set([...(user.roles || [user.role]), role]));
    const nextUser = { ...user, roles };
    const { data, error } = await supabase.auth.updateUser({
      data: userToAuthMetadata(nextUser),
    });
    if (error) return { success: false, message: error.message };
    const mappedUser = data.user ? mapSupabaseUser(data.user) : nextUser;
    set({ user: mappedUser });
    await upsertProfile(mappedUser, get().profilePhoto);
    return { success: true, user: mappedUser };
  },
  syncAuthUser: (authUser) => {
    if (!authUser) {
      set({ user: null, isAuthenticated: false, authInitialized: true, ...emptyUserData });
      return;
    }
    const user = mapSupabaseUser(authUser);
    set({ user, isAuthenticated: true, authInitialized: true });
    void loadCloudData(set, user);
  },
  initializeAuth: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      set({ user: null, isAuthenticated: false, authInitialized: true, ...emptyUserData });
      return;
    }
    const user = mapSupabaseUser(data.session.user);
    set({ user, isAuthenticated: true, authInitialized: true });
    await loadCloudData(set, user);
  },
  refreshCloudData: async () => {
    const user = get().user;
    if (!user) return;
    await loadCloudData(set, user);
  },
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      return { success: false, message: error?.message || 'Email or password is incorrect.' };
    }
    const user = mapSupabaseUser(data.user);
    set({ user, isAuthenticated: true, authInitialized: true });
    await loadCloudData(set, user);
    return { success: true, user };
  },
  signInWithGoogle: async (preferredRole) => {
    const redirectTo = getOAuthRedirectUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error || !data.url) {
      return { success: false, message: `${error?.message || 'Unable to start Google login.'} Redirect URL: ${redirectTo}` };
    }

    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (browserResult.type !== 'success') {
      return { success: false, message: `Google login was cancelled or could not return to the app. Redirect URL: ${redirectTo}` };
    }

    const sessionResult = await authResultFromSessionUrl(browserResult.url);
    if (sessionResult.error || !sessionResult.data?.session?.user) {
      return { success: false, message: `${sessionResult.error?.message || 'Google login did not complete.'} Redirect URL: ${redirectTo}` };
    }

    let authUser = sessionResult.data.session.user;
    const hasStoredRole = typeof authUser.user_metadata?.role === 'string' && validRoles.includes(authUser.user_metadata.role as UserRole);
    const shouldApplyPreferredRole = !!preferredRole && (!hasStoredRole || authUser.user_metadata.role !== 'admin');

    if (shouldApplyPreferredRole) {
      const roles = toUserRoles(authUser.user_metadata?.roles, toUserRole(authUser.user_metadata?.role));
      const nextRoles = Array.from(new Set([...roles, preferredRole]));
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { ...authUser.user_metadata, role: preferredRole, roles: nextRoles },
      });
      if (updateError) {
        return { success: false, message: updateError.message };
      }
      authUser = updateData.user || authUser;
    }

    const user = mapSupabaseUser(authUser);
    set({ user, isAuthenticated: true, authInitialized: true });
    await loadCloudData(set, user);
    return { success: true, user };
  },
  requestPasswordReset: async (email) => {
    const redirectTo = getPasswordResetRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      return { success: false, message: `${error.message} Redirect URL: ${redirectTo}` };
    }

    return {
      success: true,
      message: 'Password reset email sent.',
    };
  },
  resendEmailConfirmation: async (email) => {
    const redirectTo = getOAuthRedirectUrl();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { success: false, message: `${error.message} Redirect URL: ${redirectTo}` };
    }

    return {
      success: true,
      message: 'Confirmation email sent.',
    };
  },
  registerUser: async (user, password) => {
    const redirectTo = getOAuthRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email: user.email.trim(),
      password,
      options: {
        data: userToAuthMetadata(user),
        emailRedirectTo: redirectTo,
      },
    });
    if (error || !data.user) {
      const message = error?.message || 'Unable to create this account.';
      return {
        success: false,
        message: isExistingAccountError(message) ? EXISTING_ACCOUNT_MESSAGE : message,
      };
    }
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, message: EXISTING_ACCOUNT_MESSAGE };
    }
    const nextUser = mapSupabaseUser(data.user);
    if (!data.session) {
      set({ user: null, isAuthenticated: false, authInitialized: true, ...emptyUserData });
      return {
        success: true,
        user: nextUser,
        requiresEmailConfirmation: true,
        message: 'Check your email to confirm your account, then log in.',
      };
    }
    set({ user: nextUser, isAuthenticated: true, authInitialized: true });
    await loadCloudData(set, nextUser);
    return { success: true, user: nextUser };
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false, authInitialized: true, ...emptyUserData });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  },
  setProfilePhoto: async (uri) => {
    const user = get().user;
    const profilePhotoUri = user ? await uploadProfilePhoto(user.id, uri) : uri;
    const conversations = get().conversations.map(conversation => {
      if (!user) return conversation;
      if (conversation.ownerId === user.id) {
        return { ...conversation, initiatorPhoto: profilePhotoUri };
      }
      if (conversation.participantId === user.id) {
        return { ...conversation, participantPhoto: profilePhotoUri };
      }
      return conversation;
    });
    set({ profilePhoto: profilePhotoUri, conversations });
    if (user) {
      void upsertProfile(user, profilePhotoUri);
      conversations.forEach(conversation => {
        if (conversation.ownerId === user.id || conversation.participantId === user.id) {
          void saveConversation(conversation.ownerId || user.id, conversation);
        }
      });
    }
  },
  addPortfolioItem: (item) => {
    set((s) => ({ portfolioItems: [...s.portfolioItems, item] }));
    const ownerId = get().user?.id;
    if (ownerId) void savePortfolioItem(ownerId, item);
  },
  removePortfolioItem: (id) => {
    set((s) => ({ portfolioItems: s.portfolioItems.filter(p => p.id !== id) }));
    void deleteCloudRow('portfolio_items', id);
  },
  addClient: (client) => {
    const nextClient = { ...client, id: client.id || generateId() };
    set((s) => ({ clients: [...s.clients, nextClient] }));
    const ownerId = get().user?.id;
    if (ownerId) void saveClient(ownerId, nextClient);
  },
  addQuote: (quote) => {
    const nextQuote = { ...quote, id: quote.id || generateId() };
    set((s) => ({ quotes: [...s.quotes, nextQuote] }));
    const ownerId = get().user?.id;
    if (ownerId) void saveQuote(ownerId, nextQuote);
  },
  updateQuote: (id, updates) => {
    const nextQuote = get().quotes.find(q => q.id === id);
    const updatedQuote = nextQuote ? { ...nextQuote, ...updates } : undefined;
    set((s) => ({ quotes: s.quotes.map(q => q.id === id ? { ...q, ...updates } : q) }));
    const ownerId = get().user?.id;
    if (ownerId && updatedQuote) void saveQuote(ownerId, updatedQuote);
  },
  deleteQuote: (id) => {
    set((s) => ({ quotes: s.quotes.filter(q => q.id !== id) }));
    void deleteCloudRow('quotes', id);
  },
  addInvoice: (invoice) => {
    const nextInvoice = { ...invoice, id: invoice.id || generateId() };
    set((s) => ({ invoices: [...s.invoices, nextInvoice] }));
    const ownerId = get().user?.id;
    if (ownerId) void saveInvoice(ownerId, nextInvoice);
  },
  updateInvoice: (id, updates) => {
    const nextInvoice = get().invoices.find(i => i.id === id);
    const updatedInvoice = nextInvoice ? { ...nextInvoice, ...updates } : undefined;
    set((s) => {
      const invoice = updatedInvoice;
      const relatedJob = invoice
        ? s.jobs.find(job => job.invoiceId === invoice.id || (invoice.quoteId && job.quoteId === invoice.quoteId))
        : undefined;
      const jobUpdates = invoice && relatedJob ? relatedJobPaymentUpdates(relatedJob, invoice) : {};

      return {
        invoices: s.invoices.map(i => i.id === id ? { ...i, ...updates } : i),
        jobs: Object.keys(jobUpdates).length
          ? s.jobs.map(job => job.id === relatedJob?.id ? { ...job, ...jobUpdates } : job)
          : s.jobs,
      };
    });
    const ownerId = get().user?.id;
    if (ownerId && updatedInvoice) void saveInvoice(ownerId, updatedInvoice);
    const relatedJob = updatedInvoice
      ? get().jobs.find(job => job.invoiceId === updatedInvoice.id || (updatedInvoice.quoteId && job.quoteId === updatedInvoice.quoteId))
      : undefined;
    if (ownerId && updatedInvoice && relatedJob) void saveJob(ownerId, relatedJob);
  },
  deleteInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter(invoice => invoice.id !== id) }));
    void deleteCloudRow('invoices', id);
  },
  addJob: (job) => {
    const ownerId = get().user?.id;
    const nextJob = { ...job, id: job.id || generateId(), ownerId };
    set((s) => ({ jobs: [...s.jobs, nextJob] }));
    if (ownerId) void saveJob(ownerId, nextJob);
  },
  updateJob: (id, updates) => {
    const nextJob = get().jobs.find(j => j.id === id);
    const updatedJob = nextJob ? { ...nextJob, ...updates } : undefined;
    set((s) => ({ jobs: s.jobs.map(j => j.id === id ? { ...j, ...updates } : j) }));
    const ownerId = get().user?.id;
    if (ownerId && updatedJob) void saveJob(ownerId, updatedJob);
  },
  assignJobToPro: (jobId, proId, proName) => {
    const now = new Date().toISOString();
    const updates: Partial<Job> = {
      assignedProId: proId,
      assignedProName: proName,
      assignedAt: now,
      status: 'in_progress',
    };
    get().updateJob(jobId, updates);
  },
  startConversation: (input) => {
    const user = get().user;
    if (!user) return '';
    const participantUserId = input.participantUserId || (isUuid(input.participantId) ? input.participantId : undefined);
    const existing = get().conversations.find(item => {
      const sameParticipantId = item.participantId === input.participantId;
      const sameParticipantUser = participantUserId && item.participantUserIds?.includes(participantUserId);
      const sameOwnerPair = item.ownerId === participantUserId && item.participantUserIds?.includes(user.id);
      const sameLegacyPair = item.ownerId === user.id && participantUserId && item.participantId === participantUserId;
      const sameReverseLegacyPair = item.ownerId === participantUserId && item.participantId === user.id;
      const sameJob = input.jobId && item.jobId === input.jobId;
      // Name+role match: used when there is no UUID — matches by display name to avoid
      // merging conversations with different customers who share similar job descriptions.
      const sameLooseParticipant = !participantUserId && item.participantName === input.participantName && item.participantRole === input.participantRole;
      return sameJob || sameParticipantId || sameParticipantUser || sameOwnerPair || sameLegacyPair || sameReverseLegacyPair || sameLooseParticipant;
    });
    if (existing) {
      const mergedUserIds = Array.from(new Set([
        ...(existing.participantUserIds || []),
        user.id,
        participantUserId,
      ].filter((value): value is string => !!value)));
      const patchedConversation = {
        ...existing,
        participantUserIds: mergedUserIds,
        jobId: existing.jobId || input.jobId,
        participantPhoto: existing.participantPhoto || input.participantPhoto,
        subject: existing.subject || input.subject,
      };
      set((s) => ({
        conversations: s.conversations.map(item => item.id === existing.id ? patchedConversation : item),
      }));
      void saveConversation(patchedConversation.ownerId || user.id, patchedConversation);
      return existing.id;
    }
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: generateId(),
      ownerId: user.id,
      initiatorName: user.name,
      initiatorPhoto: get().profilePhoto,
      participantId: input.participantId,
      participantName: input.participantName,
      participantPhoto: input.participantPhoto,
      participantRole: input.participantRole,
      participantUserIds: [
        user.id,
        participantUserId,
      ].filter((value): value is string => !!value),
      jobId: input.jobId,
      subject: input.subject,
      quoteRequested: input.quoteRequested,
      lastMessage: input.initialMessage || (input.quoteRequested ? 'Quote request started' : 'Conversation started'),
      createdAt: now,
      updatedAt: now,
    };
    const ownerId = get().user?.id;
    set((s) => ({ conversations: [conversation, ...s.conversations] }));
    if (ownerId) void saveConversation(ownerId, conversation);
    return conversation.id;
  },
  addMessage: async (conversationId, text, attachment, action) => {
    const body = text.trim();
    const user = get().user;
    if ((!body && !attachment) || !user) return;
    const now = new Date().toISOString();
    const preview = body || (attachment ? 'Photo' : action?.actionType === 'invoice_payment' ? 'Invoice sent' : action?.actionType === 'quote_review' ? 'Quote sent' : '');
    const message: ChatMessage = {
      id: generateId(),
      conversationId,
      senderId: user.id,
      senderName: user.name,
      text: preview,
      mediaUri: attachment?.uri,
      mediaType: attachment?.type,
      actionType: action?.actionType,
      actionLabel: action?.actionLabel,
      actionPayload: action?.actionPayload,
      createdAt: now,
    };
    const updatedConversation = get().conversations.find(item => item.id === conversationId);
    const nextConversation = updatedConversation ? { ...updatedConversation, lastMessage: preview, updatedAt: now } : undefined;
    set((s) => ({
      messages: [...s.messages, message],
      conversations: s.conversations.map(item => item.id === conversationId ? { ...item, lastMessage: preview, updatedAt: now } : item),
    }));
    if (user.id) {
      const uploadedUri = attachment ? await uploadChatImage(user.id, attachment.uri) : undefined;
      const savedMessage = uploadedUri ? { ...message, mediaUri: uploadedUri } : message;
      if (uploadedUri) {
        set((s) => ({
          messages: s.messages.map(item => item.id === message.id ? savedMessage : item),
        }));
      }
      // Save conversation first — messages RLS checks conversation existence.
      // Awaiting here prevents the race where saveMessage reaches Supabase before
      // the conversation row is committed.
      if (nextConversation) await saveConversation(nextConversation.ownerId || user.id, nextConversation);
      void saveMessage(user.id, savedMessage);
    }
  },

  deleteConversation: (id) => {
    set((s) => ({
      conversations: s.conversations.filter(c => c.id !== id),
      messages: s.messages.filter(m => m.conversationId !== id),
    }));
    void deleteCloudRow('conversations', id);
  },

  getDashboardStats: () => {
    const { invoices, jobs, quotes, user } = get();
    const ownJobs = jobs.filter(job => !job.ownerId || job.ownerId === user?.id);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalEarningsMonth = invoices
      .filter(i => i.status === 'paid' && new Date(i.paidAt || '') >= monthStart)
      .reduce((sum, i) => sum + i.total, 0);
    const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
    const scheduledJobs = ownJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length;
    const activeQuotes = quotes.filter(q => q.status === 'draft' || q.status === 'sent').length;
    return { totalEarningsMonth, pendingInvoices, scheduledJobs, activeQuotes };
  },

  setLoading: (val) => set({ isLoading: val }),

  requestWithdrawal: (amount, bankLast4) => set((s) => {
    const record: WithdrawalRecord = {
      id: generateId(), amount, status: 'pending',
      bankLast4, createdAt: new Date().toISOString(),
    };
    const ownerId = get().user?.id;
    if (ownerId) void saveWithdrawal(ownerId, record);
    return {
      withdrawals: [record, ...s.withdrawals],
      availableBalance: s.availableBalance - amount,
      totalWithdrawn: s.totalWithdrawn + amount,
    };
  }),
}), {
  name: 'fieldmind-app-state',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    clients: state.clients,
    quotes: state.quotes,
    invoices: state.invoices,
    jobs: state.jobs,
    conversations: state.conversations,
    messages: state.messages,
    withdrawals: state.withdrawals,
    availableBalance: state.availableBalance,
    pendingBalance: state.pendingBalance,
    totalWithdrawn: state.totalWithdrawn,
    profilePhoto: state.profilePhoto,
    portfolioItems: state.portfolioItems,
  }),
}));
