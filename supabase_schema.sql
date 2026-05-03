-- ============================================================
-- VERTEX GO - Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS / ROLES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'enroller' CHECK (role IN ('super_admin', 'admin', 'enroller')),
  created_by UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  account_number TEXT UNIQUE NOT NULL, -- same as id_number
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  id_number TEXT UNIQUE NOT NULL,
  id_image_url TEXT,                   -- uploaded ID photo
  enrolled_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEVICES
-- ============================================================
CREATE TABLE public.devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_imei TEXT UNIQUE NOT NULL,
  device_model TEXT,
  device_name TEXT,
  android_id TEXT UNIQUE,
  enrollment_token TEXT,
  is_enrolled BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  customer_id UUID REFERENCES public.customers(id),
  enrolled_by UUID REFERENCES public.profiles(id),
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  device_id UUID REFERENCES public.devices(id) NOT NULL,
  device_price NUMERIC(10,2) NOT NULL,
  daily_rate NUMERIC(10,2) NOT NULL,
  total_paid NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) GENERATED ALWAYS AS (device_price - total_paid) STORED,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
  next_due_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 day',
  last_payment_date DATE,
  days_overdue INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  loan_id UUID REFERENCES public.loans(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEVICE LOCK COMMANDS (queue for Android app to poll)
-- ============================================================
CREATE TABLE public.device_commands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) NOT NULL,
  command TEXT NOT NULL CHECK (command IN ('lock', 'unlock', 'wipe')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'executed')),
  issued_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- ============================================================
-- ENROLLMENT TOKENS (for Android Device Owner enrollment)
-- ============================================================
CREATE TABLE public.enrollment_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  device_id UUID REFERENCES public.devices(id),
  customer_id UUID REFERENCES public.customers(id),
  daily_rate NUMERIC(10,2),
  is_used BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollment_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own; super_admin sees all
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin')
  ));

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'
  ));

-- Authenticated users (enrollers+) can read customers/devices/loans
CREATE POLICY "customers_all_auth" ON public.customers FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "devices_all_auth" ON public.devices FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "loans_all_auth" ON public.loans FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "payments_all_auth" ON public.payments FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "commands_all_auth" ON public.device_commands FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "tokens_all_auth" ON public.enrollment_tokens FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- After payment inserted: update loan totals and device lock state
CREATE OR REPLACE FUNCTION after_payment_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_device_id UUID;
BEGIN
  SELECT * INTO v_loan FROM public.loans WHERE id = NEW.loan_id;
  
  -- Update loan total_paid and next_due_date
  UPDATE public.loans SET
    total_paid = total_paid + NEW.amount,
    last_payment_date = NEW.payment_date,
    next_due_date = CURRENT_DATE + INTERVAL '1 day',
    days_overdue = 0,
    status = CASE WHEN (total_paid + NEW.amount) >= device_price THEN 'completed' ELSE status END
  WHERE id = NEW.loan_id;

  -- Unlock device when payment is made
  SELECT device_id INTO v_device_id FROM public.loans WHERE id = NEW.loan_id;
  
  UPDATE public.devices SET is_locked = FALSE WHERE id = v_device_id;
  
  INSERT INTO public.device_commands (device_id, command, issued_by)
  VALUES (v_device_id, 'unlock', NEW.recorded_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_after_payment AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION after_payment_insert();

-- Daily job to lock overdue devices (run via pg_cron or edge function scheduler)
CREATE OR REPLACE FUNCTION lock_overdue_devices()
RETURNS void AS $$
BEGIN
  -- Mark loans as overdue
  UPDATE public.loans
  SET days_overdue = (CURRENT_DATE - next_due_date)::INT
  WHERE status = 'active' AND next_due_date < CURRENT_DATE;

  -- Lock devices with overdue loans
  UPDATE public.devices d
  SET is_locked = TRUE
  FROM public.loans l
  WHERE l.device_id = d.id AND l.status = 'active' AND l.days_overdue > 0 AND d.is_locked = FALSE;

  -- Issue lock commands
  INSERT INTO public.device_commands (device_id, command)
  SELECT d.id, 'lock'
  FROM public.devices d
  JOIN public.loans l ON l.device_id = d.id
  WHERE l.status = 'active' AND l.days_overdue > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.device_commands dc
    WHERE dc.device_id = d.id AND dc.command = 'lock' AND dc.status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage bucket for ID images (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('id-images', 'id-images', false);
