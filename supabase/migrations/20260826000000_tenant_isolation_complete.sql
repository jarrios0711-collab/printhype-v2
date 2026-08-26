-- ============================================================================
-- PrintHype v2 — Fase 1: Aislamiento multi-tenant COMPLETO (todas las tablas)
-- Fecha: 2026-08-26
--
-- Cierra el gap de seguridad donde cualquier usuario autenticado podía leer
-- o modificar filas de otros talleres (políticas "using (true)").
--
-- Aplica solo a usuarios autenticados (la app escribe vía service role, que
-- salta RLS por diseño; esto es defensa en profundidad para consultas directas).
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================================

-- ── 1. order_registry ────────────────────────────────────────────────────────
alter table order_registry enable row level security;
drop policy if exists "Authenticated users can read orders" on order_registry;
drop policy if exists "Authenticated users can insert orders" on order_registry;
drop policy if exists "Authenticated users can update orders" on order_registry;
drop policy if exists "users_own_orders" on order_registry;
create policy "users_own_orders" on order_registry
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. impresoras ────────────────────────────────────────────────────────────
alter table impresoras enable row level security;
drop policy if exists "Authenticated users can read printers" on impresoras;
drop policy if exists "Authenticated users can insert printers" on impresoras;
drop policy if exists "Authenticated users can delete printers" on impresoras;
drop policy if exists "users_own_printers" on impresoras;
create policy "users_own_printers" on impresoras
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 3. inventory_items ───────────────────────────────────────────────────────
alter table inventory_items enable row level security;
drop policy if exists "Authenticated users can read inventory" on inventory_items;
drop policy if exists "Authenticated users can insert inventory" on inventory_items;
drop policy if exists "Authenticated users can update inventory" on inventory_items;
drop policy if exists "users_own_inventory" on inventory_items;
create policy "users_own_inventory" on inventory_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. project_board ─────────────────────────────────────────────────────────
alter table project_board enable row level security;
drop policy if exists "Authenticated users can read projects" on project_board;
drop policy if exists "Authenticated users can insert projects" on project_board;
drop policy if exists "Authenticated users can update projects" on project_board;
drop policy if exists "users_own_projects" on project_board;
create policy "users_own_projects" on project_board
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. ajustes (config global del taller, sin datos por usuario) ─────────────
-- La app escribe ajustes vía service role (POST /api/settings). Solo se deja
-- lectura para autenticados; se elimina la política de UPDATE abierta.
alter table ajustes enable row level security;
drop policy if exists "Authenticated users can update settings" on ajustes;
drop policy if exists "Authenticated users can read settings" on ajustes;
create policy "Authenticated users can read global settings" on ajustes
  for select to authenticated using (true);

-- ── 6. filament_profiles ─────────────────────────────────────────────────────
alter table filament_profiles enable row level security;
drop policy if exists "Authenticated users can read filament profiles" on filament_profiles;
drop policy if exists "Authenticated users can insert filament profiles" on filament_profiles;
drop policy if exists "Authenticated users can delete filament profiles" on filament_profiles;
drop policy if exists "users_own_filaments" on filament_profiles;
create policy "users_own_filaments" on filament_profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 7. user_ai_config (ya scoped; falta DELETE) ──────────────────────────────
drop policy if exists "Users can delete their own AI config" on user_ai_config;
create policy "Users can delete their own AI config" on user_ai_config
  for delete to authenticated using (auth.uid() = user_id);

-- ── 8. viral_campaigns ───────────────────────────────────────────────────────
alter table viral_campaigns enable row level security;
drop policy if exists "Authenticated users can read campaigns" on viral_campaigns;
drop policy if exists "Authenticated users can insert campaigns" on viral_campaigns;
drop policy if exists "users_own_campaigns" on viral_campaigns;
create policy "users_own_campaigns" on viral_campaigns
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 9. ai_chat_history (NO tenía RLS → gap crítico) ──────────────────────────
-- (tabla opcional: solo se toca si existe — viene de la migración manual 002)
do $$
begin
  if to_regclass('public.ai_chat_history') is not null then
    execute 'alter table public.ai_chat_history enable row level security';
    execute 'drop policy if exists "Users read own chat history" on public.ai_chat_history';
    execute 'drop policy if exists "Users insert own chat history" on public.ai_chat_history';
    execute 'drop policy if exists "Users update own chat history" on public.ai_chat_history';
    execute 'drop policy if exists "Users delete own chat history" on public.ai_chat_history';
    execute 'create policy "Users read own chat history" on public.ai_chat_history for select to authenticated using (auth.uid() = user_id)';
    execute 'create policy "Users insert own chat history" on public.ai_chat_history for insert to authenticated with check (auth.uid() = user_id)';
    execute 'create policy "Users update own chat history" on public.ai_chat_history for update to authenticated using (auth.uid() = user_id)';
    execute 'create policy "Users delete own chat history" on public.ai_chat_history for delete to authenticated using (auth.uid() = user_id)';
    execute 'create index if not exists idx_ai_chat_history_user_id on public.ai_chat_history(user_id)';
  end if;
end $$;

-- ── 10. user_notification_preferences (NO tenía RLS → gap crítico) ───────────
-- (tabla opcional: solo se toca si existe — viene de la migración manual 002)
do $$
begin
  if to_regclass('public.user_notification_preferences') is not null then
    execute 'alter table public.user_notification_preferences enable row level security';
    execute 'drop policy if exists "Users read own notification preferences" on public.user_notification_preferences';
    execute 'drop policy if exists "Users insert own notification preferences" on public.user_notification_preferences';
    execute 'drop policy if exists "Users update own notification preferences" on public.user_notification_preferences';
    execute 'drop policy if exists "Users delete own notification preferences" on public.user_notification_preferences';
    execute 'create policy "Users read own notification preferences" on public.user_notification_preferences for select to authenticated using (auth.uid() = user_id)';
    execute 'create policy "Users insert own notification preferences" on public.user_notification_preferences for insert to authenticated with check (auth.uid() = user_id)';
    execute 'create policy "Users update own notification preferences" on public.user_notification_preferences for update to authenticated using (auth.uid() = user_id)';
    execute 'create policy "Users delete own notification preferences" on public.user_notification_preferences for delete to authenticated using (auth.uid() = user_id)';
    execute 'create index if not exists idx_user_notification_preferences_user_id on public.user_notification_preferences(user_id)';
  end if;
end $$;

-- ── Nota: order_activity_log ya fue corregida (20260824000000) ───────────────
-- ── budgets / user_settings / user_subscriptions / billing_events ya son scoped ──
