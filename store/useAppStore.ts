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
  upsertProfile,
} from '../lib/cloudData';
import { User, UserRole, TradeType, PropertyType, PricingMode, Client, Quote, Invoice, Job, DashboardStats, Conversation, ChatMessage } from '../lib/types';

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
  syncAuthUser: (authUser: SupabaseAuthUser | null) => void;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<AuthResult>;
  registerUser: (user: User, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
  setProfilePhoto: (uri: string) => void;
  addPortfolioItem: (item: PortfolioItem) => void;
  removePortfolioItem: (id: string) => void;
  addClient: (client: Client) => void;
  addQuote: (quote: Quote) => void;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  startConversation: (input: { participantId: string; participantName: string; participantRole: UserRole; subject?: string; quoteRequested?: boolean; initialMessage?: string }) => string;
  addMessage: (conversationId: string, text: string) => void;
  getDashboardStats: () => DashboardStats;
  setLoading: (val: boolean) => void;
  requestWithdrawal: (amount: number, bankLast4: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const validRoles: UserRole[] = ['tradesperson', 'customer', 'admin'];
const validTrades: TradeType[] = ['plumber', 'electrician', 'hvac', 'carpenter', 'painter', 'roofer', 'landscaper', 'engineer', 'hairstylist', 'tailor', 'cobbler', 'cleaner', 'mechanic', 'makeup_artist', 'photographer', 'general'];
const validPropertyTypes: PropertyType[] = ['home', 'apartment', 'office', 'commercial', 'rental'];
const validPricingModes: PricingMode[] = ['hourly', 'fixed', 'quote'];

const toUserRole = (role: unknown): UserRole => (
  typeof role === 'string' && validRoles.includes(role as UserRole) ? role as UserRole : 'customer'
);

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
  const displayName = getFirstString(metadata.name, metadata.full_name, metadata.display_name, authUser.email?.split('@')[0]);
  const user: User = {
    id: authUser.id,
    role,
    name: displayName || 'FieldMind User',
    email: authUser.email || '',
    phone: typeof metadata.phone === 'string' ? metadata.phone : '',
    createdAt: authUser.created_at || new Date().toISOString(),
  };

  if (role === 'tradesperson') {
    user.businessName = typeof metadata.businessName === 'string' ? metadata.businessName : undefined;
    user.trade = toTradeType(metadata.trade) || 'general';
    user.pricingMode = toPricingMode(metadata.pricingMode);
    user.hourlyRate = typeof metadata.hourlyRate === 'number' ? metadata.hourlyRate : undefined;
    user.fixedRate = typeof metadata.fixedRate === 'number' ? metadata.fixedRate : undefined;
    user.yearsExperience = typeof metadata.yearsExperience === 'number' ? metadata.yearsExperience : undefined;
    user.serviceArea = typeof metadata.serviceArea === 'string' ? metadata.serviceArea : undefined;
    user.licenseNumber = typeof metadata.licenseNumber === 'string' ? metadata.licenseNumber : undefined;
    user.bio = typeof metadata.bio === 'string' ? metadata.bio : undefined;
  }

  if (role === 'customer') {
    user.propertyAddress = typeof metadata.propertyAddress === 'string' ? metadata.propertyAddress : undefined;
    user.propertyType = toPropertyType(metadata.propertyType);
  }

  return user;
};

const userToAuthMetadata = (user: User) => ({
  role: user.role,
  name: user.name,
  phone: user.phone,
  businessName: user.businessName,
  trade: user.trade,
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

const loadCloudData = async (setState: (state: Partial<AppState>) => void, user: User) => {
  await upsertProfile(user);
  const cloudState = await fetchCloudState();
  setState(cloudState);
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
    const redirectTo = Linking.createURL('auth/callback');
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
      return { success: false, message: error?.message || 'Unable to start Google login.' };
    }

    const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (browserResult.type !== 'success') {
      return { success: false, message: 'Google login was cancelled.' };
    }

    const sessionResult = await authResultFromSessionUrl(browserResult.url);
    if (sessionResult.error || !sessionResult.data?.session?.user) {
      return { success: false, message: sessionResult.error?.message || 'Google login did not complete.' };
    }

    let authUser = sessionResult.data.session.user;
    const hasStoredRole = typeof authUser.user_metadata?.role === 'string' && validRoles.includes(authUser.user_metadata.role as UserRole);
    const shouldApplyPreferredRole = !!preferredRole && (!hasStoredRole || authUser.user_metadata.role !== 'admin');

    if (shouldApplyPreferredRole) {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { ...authUser.user_metadata, role: preferredRole },
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
  registerUser: async (user, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: user.email.trim(),
      password,
      options: { data: userToAuthMetadata(user) },
    });
    if (error || !data.user) {
      return { success: false, message: error?.message || 'Unable to create this account.' };
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
  setProfilePhoto: (uri) => {
    set({ profilePhoto: uri });
    const user = get().user;
    if (user) void upsertProfile(user, uri);
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
    set((s) => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, ...updates } : i) }));
    const ownerId = get().user?.id;
    if (ownerId && updatedInvoice) void saveInvoice(ownerId, updatedInvoice);
  },
  addJob: (job) => {
    const nextJob = { ...job, id: job.id || generateId() };
    set((s) => ({ jobs: [...s.jobs, nextJob] }));
    const ownerId = get().user?.id;
    if (ownerId) void saveJob(ownerId, nextJob);
  },
  updateJob: (id, updates) => {
    const nextJob = get().jobs.find(j => j.id === id);
    const updatedJob = nextJob ? { ...nextJob, ...updates } : undefined;
    set((s) => ({ jobs: s.jobs.map(j => j.id === id ? { ...j, ...updates } : j) }));
    const ownerId = get().user?.id;
    if (ownerId && updatedJob) void saveJob(ownerId, updatedJob);
  },
  startConversation: (input) => {
    const existing = get().conversations.find(item => item.participantId === input.participantId && item.subject === input.subject);
    if (existing) return existing.id;
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: generateId(),
      participantId: input.participantId,
      participantName: input.participantName,
      participantRole: input.participantRole,
      subject: input.subject,
      quoteRequested: input.quoteRequested,
      lastMessage: input.initialMessage || (input.quoteRequested ? 'Quote request started' : 'Conversation started'),
      createdAt: now,
      updatedAt: now,
    };
    const ownerId = get().user?.id;
    set((s) => ({ conversations: [conversation, ...s.conversations] }));
    if (ownerId) void saveConversation(ownerId, conversation);
    if (input.initialMessage) {
      get().addMessage(conversation.id, input.initialMessage);
    }
    return conversation.id;
  },
  addMessage: (conversationId, text) => {
    const body = text.trim();
    const user = get().user;
    if (!body || !user) return;
    const now = new Date().toISOString();
    const message: ChatMessage = {
      id: generateId(),
      conversationId,
      senderId: user.id,
      senderName: user.name,
      text: body,
      createdAt: now,
    };
    const updatedConversation = get().conversations.find(item => item.id === conversationId);
    const nextConversation = updatedConversation ? { ...updatedConversation, lastMessage: body, updatedAt: now } : undefined;
    set((s) => ({
      messages: [...s.messages, message],
      conversations: s.conversations.map(item => item.id === conversationId ? { ...item, lastMessage: body, updatedAt: now } : item),
    }));
    if (user.id) {
      void saveMessage(user.id, message);
      if (nextConversation) void saveConversation(user.id, nextConversation);
    }
  },

  getDashboardStats: () => {
    const { invoices, jobs, quotes } = get();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalEarningsMonth = invoices
      .filter(i => i.status === 'paid' && new Date(i.paidAt || '') >= monthStart)
      .reduce((sum, i) => sum + i.total, 0);
    const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length;
    const scheduledJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length;
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
