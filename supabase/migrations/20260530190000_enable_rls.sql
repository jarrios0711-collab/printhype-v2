-- PrintHype v2 — RLS Policies
-- Enable Row Level Security on all tables + policies for authenticated users

-- Helper: check if the requesting user is authenticated
-- (RLS runs in the anon / authenticated role context, not service_role)

-- 1. order_registry
alter table order_registry enable row level security;
create policy "Authenticated users can read orders"
  on order_registry for select
  to authenticated
  using (true);
create policy "Authenticated users can insert orders"
  on order_registry for insert
  to authenticated
  with check (true);
create policy "Authenticated users can update orders"
  on order_registry for update
  to authenticated
  using (true);

-- 2. impresoras
alter table impresoras enable row level security;
create policy "Authenticated users can read printers"
  on impresoras for select
  to authenticated
  using (true);
create policy "Authenticated users can insert printers"
  on impresoras for insert
  to authenticated
  with check (true);
create policy "Authenticated users can delete printers"
  on impresoras for delete
  to authenticated
  using (true);

-- 3. inventory_items
alter table inventory_items enable row level security;
create policy "Authenticated users can read inventory"
  on inventory_items for select
  to authenticated
  using (true);
create policy "Authenticated users can insert inventory"
  on inventory_items for insert
  to authenticated
  with check (true);
create policy "Authenticated users can update inventory"
  on inventory_items for update
  to authenticated
  using (true);

-- 4. project_board
alter table project_board enable row level security;
create policy "Authenticated users can read projects"
  on project_board for select
  to authenticated
  using (true);
create policy "Authenticated users can insert projects"
  on project_board for insert
  to authenticated
  with check (true);
create policy "Authenticated users can update projects"
  on project_board for update
  to authenticated
  using (true);

-- 5. ajustes
alter table ajustes enable row level security;
create policy "Authenticated users can read settings"
  on ajustes for select
  to authenticated
  using (true);
create policy "Authenticated users can update settings"
  on ajustes for update
  to authenticated
  using (true);

-- 6. filament_profiles
alter table filament_profiles enable row level security;
create policy "Authenticated users can read filament profiles"
  on filament_profiles for select
  to authenticated
  using (true);
create policy "Authenticated users can insert filament profiles"
  on filament_profiles for insert
  to authenticated
  with check (true);
create policy "Authenticated users can delete filament profiles"
  on filament_profiles for delete
  to authenticated
  using (true);

-- 7. user_ai_config (user-scoped: each user only sees their own row)
alter table user_ai_config enable row level security;
create policy "Users can read their own AI config"
  on user_ai_config for select
  to authenticated
  using (auth.uid() = user_id);
create policy "Users can upsert their own AI config"
  on user_ai_config for insert
  to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update their own AI config"
  on user_ai_config for update
  to authenticated
  using (auth.uid() = user_id);

-- 8. viral_campaigns
alter table viral_campaigns enable row level security;
create policy "Authenticated users can read campaigns"
  on viral_campaigns for select
  to authenticated
  using (true);
create policy "Authenticated users can insert campaigns"
  on viral_campaigns for insert
  to authenticated
  with check (true);
