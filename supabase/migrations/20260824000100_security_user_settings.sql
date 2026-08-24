-- Fase 0.2: settings financieros per-user (reemplaza el ajustes global compartido
-- como fuente de verdad financiera; aplicada a la DB real el 2026-08-24 vía MCP)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'ARS',
  kwh_price numeric not null default 120.50,
  profit_margin numeric not null default 1.5,
  labor_hour_price numeric not null default 800,
  fail_rate_percent numeric not null default 10,
  overhead_per_job numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table user_settings enable row level security;
drop policy if exists "Users read own settings" on user_settings;
create policy "Users read own settings" on user_settings
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users insert own settings" on user_settings;
create policy "Users insert own settings" on user_settings
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own settings" on user_settings;
create policy "Users update own settings" on user_settings
  for update to authenticated using (auth.uid() = user_id);
