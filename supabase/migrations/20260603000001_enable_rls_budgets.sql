-- PrintHype v2 — RLS para tabla budgets
-- Creado: 2026-06-03

alter table budgets enable row level security;

-- Los usuarios solo pueden ver sus propios presupuestos
create policy "Users can read own budgets" on budgets
  for select to authenticated
  using (auth.uid() = user_id);

-- Los usuarios solo pueden crear presupuestos con su propio user_id
create policy "Users can insert own budgets" on budgets
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propios presupuestos
create policy "Users can update own budgets" on budgets
  for update to authenticated
  using (auth.uid() = user_id);

-- Los usuarios solo pueden eliminar sus propios presupuestos
create policy "Users can delete own budgets" on budgets
  for delete to authenticated
  using (auth.uid() = user_id);
