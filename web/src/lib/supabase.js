import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tonlofhigkpbcsmfesjq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmxvZmhpZ2twYmNzbWZlc2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjE2MzUsImV4cCI6MjA5MzM5NzYzNX0.fgbSNhM_Tjfw7IlmQfQkR2Fc1qgKQkpbJGqbyyiyXXk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
  global: {
    headers: {
      'x-application-name': 'vertexgo',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    enabled: false,
  },
});

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data, error };
};

export const getCustomers = () =>
  supabase.from('customers').select('*, loans(*, devices(*))').order('created_at', { ascending: false });

export const getCustomerByAccount = (accountNumber) =>
  supabase.from('customers').select('*, loans(*, devices(*))').eq('account_number', accountNumber).maybeSingle();

export const createCustomer = (data) =>
  supabase.from('customers').insert(data).select().single();

export const getDevices = () =>
  supabase.from('devices').select('*, customers(*), loans(*)').order('created_at', { ascending: false });

export const createDevice = (data) =>
  supabase.from('devices').insert(data).select().single();

export const updateDevice = (id, data) =>
  supabase.from('devices').update(data).eq('id', id).select().single();

export const getLoans = () =>
  supabase.from('loans').select('*, customers(*), devices(*)').order('created_at', { ascending: false });

export const createLoan = (data) =>
  supabase.from('loans').insert(data).select().single();

export const getPayments = (loanId) =>
  supabase.from('payments').select('*').eq('loan_id', loanId).order('created_at', { ascending: false });

export const recordPayment = (data) =>
  supabase.from('payments').insert(data).select().single();

export const createEnrollmentToken = (data) =>
  supabase.from('enrollment_tokens').insert(data).select().single();

export const issueCommand = (deviceId, command, issuedBy) =>
  supabase.from('device_commands').insert({ device_id: deviceId, command, issued_by: issuedBy }).select().single();

export const getUsers = () =>
  supabase.from('profiles').select('*').order('created_at', { ascending: false });

export const updateUserRole = (userId, role) =>
  supabase.from('profiles').update({ role }).eq('id', userId);

export const deactivateUser = (userId) =>
  supabase.from('profiles').update({ is_active: false }).eq('id', userId);

export const activateUser = (userId) =>
  supabase.from('profiles').update({ is_active: true }).eq('id', userId);

export const getDashboardStats = async () => {
  try {
    const [customers, loans, payments] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('loans').select('id, total_paid, device_price, status, next_due_date').eq('status', 'active'),
      supabase.from('payments').select('amount').gte('payment_date',
        new Date(new Date().setDate(1)).toISOString().split('T')[0]),
    ]);
    const totalRevenue = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
    const activeLoans = loans.data?.length || 0;
    const overdueLoans = loans.data?.filter(l => l.next_due_date && new Date() > new Date(l.next_due_date)).length || 0;
    return { totalCustomers: customers.count || 0, activeLoans, overdueLoans, monthlyRevenue: totalRevenue };
  } catch (e) {
    return { totalCustomers: 0, activeLoans: 0, overdueLoans: 0, monthlyRevenue: 0 };
  }
};
