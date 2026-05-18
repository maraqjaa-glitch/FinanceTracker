-- ─────────────────────────────────────────────
-- FinFort 2.0 — Migration 001: Core Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  preferred_currency text not null default 'PLN',
  language text not null default 'pl',
  theme text not null default 'dark', -- 'dark' | 'light' | 'system'
  accent_color text not null default '#6366f1', -- hex
  monthly_income numeric(12,2),
  onboarding_completed boolean not null default false,
  active_modules jsonb not null default '{"budget":true,"savings_envelopes":true,"budget_envelopes":true,"investments":true,"portfolios":true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- HOUSEHOLDS
-- ─────────────────────────────────────────────
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member', -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  unique(household_id, user_id)
);

alter table public.household_members enable row level security;

-- Helper function: check if user belongs to household
create or replace function public.user_in_household(household_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = $1 and hm.user_id = auth.uid()
  );
$$ language sql security definer;

create policy "Members can view their household" on public.households
  for select using (public.user_in_household(id));
create policy "Members can view household_members" on public.household_members
  for select using (public.user_in_household(household_id));
create policy "Owners can manage members" on public.household_members
  for all using (
    exists (select 1 from public.household_members hm
            where hm.household_id = household_id and hm.user_id = auth.uid() and hm.role = 'owner')
  );

-- ─────────────────────────────────────────────
-- HOUSEHOLD INVITATIONS
-- ─────────────────────────────────────────────
create table public.household_invitations (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  invited_email text not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending', -- 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.household_invitations enable row level security;
create policy "Invited users can view their invitations" on public.household_invitations
  for select using (invited_email = (select email from public.profiles where id = auth.uid()));
create policy "Owners can manage invitations" on public.household_invitations
  for all using (invited_by = auth.uid());

-- ─────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, -- null = system default
  type text not null, -- 'income' | 'expense' | 'bill' | 'transfer'
  name_pl text not null,
  name_en text not null,
  icon text not null, -- emoji or lucide icon name
  color text not null default '#6366f1', -- hex
  is_system boolean not null default false, -- system categories cannot be deleted
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "Users can view system categories" on public.categories
  for select using (is_system = true);
create policy "Users can view and manage their household categories" on public.categories
  for all using (
    household_id is null and user_id = auth.uid()
    or public.user_in_household(household_id)
  );

-- ─────────────────────────────────────────────
-- SAVINGS ENVELOPES (must be defined before transactions)
-- ─────────────────────────────────────────────
create table public.savings_envelopes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  icon text not null default '💰',
  color text not null default '#10b981',
  target_amount numeric(12,2),
  initial_balance numeric(12,2) not null default 0,
  currency text not null default 'PLN',
  target_date date,
  notes text,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.savings_envelopes enable row level security;
create policy "Household members can manage savings envelopes" on public.savings_envelopes
  for all using (public.user_in_household(household_id));

-- ─────────────────────────────────────────────
-- BUDGET ENVELOPES (must be defined before transactions)
-- ─────────────────────────────────────────────
create table public.budget_envelopes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  icon text not null default '📋',
  color text not null default '#f59e0b',
  monthly_limit numeric(12,2) not null,
  currency text not null default 'PLN',
  rollover boolean not null default false, -- carry unspent budget to next month
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.budget_envelopes enable row level security;
create policy "Household members can manage budget envelopes" on public.budget_envelopes
  for all using (public.user_in_household(household_id));

-- ─────────────────────────────────────────────
-- INVESTMENT PORTFOLIOS (must be defined before transactions)
-- ─────────────────────────────────────────────
create table public.investment_portfolios (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  type text not null default 'other', -- 'stocks' | 'crypto' | 'gold' | 'bonds' | 'real_estate' | 'pension' | 'other'
  icon text not null default '📈',
  color text not null default '#8b5cf6',
  currency text not null default 'PLN',
  institution text, -- bank/broker name
  notes text,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.investment_portfolios enable row level security;
create policy "Household members can manage portfolios" on public.investment_portfolios
  for all using (public.user_in_household(household_id));

-- Portfolio valuations (manual snapshots of current value)
create table public.portfolio_valuations (
  id uuid primary key default uuid_generate_v4(),
  portfolio_id uuid references public.investment_portfolios(id) on delete cascade not null,
  valuation_date date not null,
  current_value numeric(12,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_valuations enable row level security;
create policy "Household members can manage valuations" on public.portfolio_valuations
  for all using (
    exists (select 1 from public.investment_portfolios p
            where p.id = portfolio_id and public.user_in_household(p.household_id))
  );

-- ─────────────────────────────────────────────
-- WALLETS (bank accounts, cash, credit cards)
-- ─────────────────────────────────────────────
create table public.wallets (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  type text not null, -- 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'
  currency text not null default 'PLN',
  icon text not null default '🏦',
  color text not null default '#6366f1',
  initial_balance numeric(12,2) not null default 0,
  credit_limit numeric(12,2), -- for credit cards
  include_in_net_worth boolean not null default true,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
create policy "Household members can manage wallets" on public.wallets
  for all using (public.user_in_household(household_id));

-- ─────────────────────────────────────────────
-- RECURRING TRANSACTIONS
-- ─────────────────────────────────────────────
create table public.recurring_transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  type text not null,
  category_id uuid references public.categories(id) on delete set null,
  wallet_id uuid references public.wallets(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'PLN',
  description text not null,
  frequency text not null, -- 'daily' | 'weekly' | 'monthly' | 'yearly'
  frequency_value int not null default 1,
  start_date date not null,
  end_date date,
  next_due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.recurring_transactions enable row level security;
create policy "Household members can manage recurring transactions" on public.recurring_transactions
  for all using (public.user_in_household(household_id));

-- ─────────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  type text not null, -- 'income' | 'expense' | 'bill' | 'transfer' | 'savings_deposit' | 'savings_withdrawal' | 'investment'
  category_id uuid references public.categories(id) on delete set null,
  wallet_id uuid references public.wallets(id) on delete set null,
  to_wallet_id uuid references public.wallets(id) on delete set null, -- for transfers
  savings_envelope_id uuid references public.savings_envelopes(id) on delete set null,
  budget_envelope_id uuid references public.budget_envelopes(id) on delete set null,
  portfolio_id uuid references public.investment_portfolios(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'PLN',
  amount_in_base_currency numeric(12,2), -- auto-converted to household base currency
  exchange_rate numeric(12,6),
  date date not null,
  description text,
  notes text,
  tags text[] default '{}',
  person text, -- optional: member name for household tracking
  is_recurring boolean not null default false,
  recurring_id uuid references public.recurring_transactions(id) on delete set null,
  import_hash text, -- for deduplication on CSV import
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "Household members can manage transactions" on public.transactions
  for all using (public.user_in_household(household_id));

create index transactions_household_date on public.transactions(household_id, date desc);
create index transactions_type on public.transactions(type);
create index transactions_category on public.transactions(category_id);
create index transactions_wallet on public.transactions(wallet_id);
create index transactions_savings_envelope on public.transactions(savings_envelope_id);
create index transactions_portfolio on public.transactions(portfolio_id);
create index transactions_import_hash on public.transactions(import_hash) where import_hash is not null;

-- ─────────────────────────────────────────────
-- EXCHANGE RATES (cached)
-- ─────────────────────────────────────────────
create table public.exchange_rates (
  id uuid primary key default uuid_generate_v4(),
  base_currency text not null,
  target_currency text not null,
  rate numeric(16,8) not null,
  source text not null default 'api', -- 'api' | 'manual'
  fetched_at timestamptz not null default now(),
  unique(base_currency, target_currency)
);

-- Exchange rates are public (no sensitive data)
alter table public.exchange_rates enable row level security;
create policy "Anyone can read exchange rates" on public.exchange_rates for select using (true);
create policy "Service role can upsert exchange rates" on public.exchange_rates
  for all using (auth.role() = 'service_role');
