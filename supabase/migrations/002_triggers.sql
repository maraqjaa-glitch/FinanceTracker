-- ─────────────────────────────────────────────
-- FinFort 2.0 — Migration 002: Triggers
-- Run AFTER 001_core_schema.sql
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- Auto-create profile after signup
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- Auto-update updated_at timestamps
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.handle_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- Enable Realtime on transactions table
-- (allows household members to see live updates)
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.savings_envelopes;
alter publication supabase_realtime add table public.budget_envelopes;
