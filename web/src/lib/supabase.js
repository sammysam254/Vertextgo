import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (window.__env__ && window.__env__.SUPABASE_URL &&
   window.__env__.SUPABASE_URL !== 'RENDER_SUPABASE_URL_PLACEHOLDER')
    ? window.__env__.SUPABASE_URL
    : 'https://tonlofhigkpbcsmfesjq.supabase.co';

const supabaseAnonKey =
  (window.__env__ && window.__env__.SUPABASE_ANON_KEY &&
   window.__env__.SUPABASE_ANON_KEY !== 'RENDER_SUPABASE_ANON_KEY_PLACEHOLDER')
    ? window.__env__.SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbmxvZmhpZ2twYmNzbWZlc2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MjE2MzUsImV4cCI6MjA5MzM5NzYzNX0.fgbSNhM_Tjfw7IlmQfQkR2Fc1qgKQkpbJGqbyyiyXXk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const getCustomers = () =>
  supabase.from('customers').select('*, loans(*, devices(*))').order('created_at', { ascending: false });

export const getCustomerByAccount = (accountNumber) =>
  supabase.from('customers').select('*, loans(*, devices(*))').eq('account_number', accountNumber).single();

export const createCustomer = (data) =>
  supabase.from('customers').insert(data).select().single();

export const getDevices = () =>
  supabase.from('devices').select('*, customers(*), loans(*)').order('created_at', { ascending: false });

export const getDevice = (deviceId) =>
  supabase.from('devices').select('*, customers(*), loans(*)').eq('id', deviceId).single();

export const createDevice = (data) =>
  supabase.from('devices').insert(data).select().single();

export const updateDevice = (id, data) =>
  supabase.from('devices').update(data).eq('id', id).select().single();

export const getLoans = () =>
  supabase.from('loans').select('*, customers(*), devices(*)').order('created_at', { ascending: false });

export const getLoanByCustomer = (customerId) =>
  supabase.from('loans').select('*, devices(*)').eq('customer_id', customerId).eq('status', 'active').single();

export const createLoan = (data) =>
  supabase.from('loans').insert(data).select().single();

export const getPayments = (loanId) =>
  supabase.from('payments').select('*, profiles(full_name)').eq('loan_id', loanId).order('created_at', { ascending: false });

export const recordPayment = (data) =>
  supabase.from('payments').insert(data).select().single();

export const createEnrollmentToken = (data) =>
  supabase.from('enrollment_tokens').insert(data).select().single();

export const getEnrollmentToken = (token) =>
  supabase.from('enrollment_tokens').select('*, devices(*), customers(*)').eq('token', token).eq('is_used', false).single();

export const markTokenUsed = (tokenId) =>
  supabase.from('enrollment_tokens').update({ is_used: true }).eq('id', tokenId);

export const getPendingCommands = (deviceId) =>
  supabase.from('device_commands').select('*').eq('device_id', deviceId).eq('status', 'pending').order('created_at');

export const markCommandExecuted = (commandId) =>
  supabase.from('device_commands').update({ status: 'executed', executed_at: new Date().toISOString() }).eq('id', commandId);

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
  const [customers, devices, loans, payments] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('devices').select('id', { count: 'exact', head: true }),
    supabase.from('loans').select('id, total_paid, device_price, status, next_due_date').eq('status', 'active'),
    supabase.from('payments').select('amount').gte('payment_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]),
  ]);
  const totalRevenue = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const activeLoans = loans.data?.length || 0;
  const overdueLoans = loans.data?.filter(l => new Date() > new Date(l.next_due_date)).length || 0;
  return {
    totalCustomers: customers.count || 0,
    totalDevices: devices.count || 0,
    activeLoans,
    overdueLoans,
    monthlyRevenue: totalRevenue,
  };
};
