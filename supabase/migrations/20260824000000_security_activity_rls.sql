-- Fase 0.1: cerrar gap multi-tenant en order_activity_log
-- (aplicada a la DB real el 2026-08-24 vía MCP)
alter table order_activity_log enable row level security;
-- Eliminar la politica permisiva vieja que permitia a cualquier auth leer activity de otros talleres
drop policy if exists "users_read_order_activity" on order_activity_log;
drop policy if exists "Users read own activity" on order_activity_log;
create policy "Users read own activity" on order_activity_log
  for select to authenticated using (auth.uid() = user_id);
create index if not exists idx_order_activity_log_user_id on order_activity_log(user_id);
