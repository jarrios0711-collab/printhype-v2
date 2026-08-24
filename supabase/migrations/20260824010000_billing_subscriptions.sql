-- Fase 2: suscripciones y eventos de billing (MercadoPago)
-- (aplicada a la DB real el 2026-08-24 vía MCP)
create table if not exists user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'FREE',               -- 'FREE' | 'BASIC' | 'PRO'
  status text not null default 'active',           -- active | pending | paused | cancelled
  mp_preapproval_id text,
  mp_payer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  last_payment_at timestamptz,
  last_payment_id text,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'mercadopago',
  event_type text not null,
  resource_id text,
  payload jsonb not null default '{}',
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table user_subscriptions enable row level security;
alter table billing_events enable row level security;

drop policy if exists "Users read own subscription" on user_subscriptions;
create policy "Users read own subscription" on user_subscriptions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users insert own subscription" on user_subscriptions;
create policy "Users insert own subscription" on user_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own subscription" on user_subscriptions;
create policy "Users update own subscription" on user_subscriptions
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "Users read own billing events" on billing_events;
create policy "Users read own billing events" on billing_events
  for select to authenticated using (auth.uid() = user_id);

create index if not exists idx_billing_events_user_id on billing_events(user_id);
create index if not exists idx_user_subscriptions_mp_preapproval on user_subscriptions(mp_preapproval_id);
