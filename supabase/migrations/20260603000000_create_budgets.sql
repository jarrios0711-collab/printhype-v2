-- PrintHype v2 — Tabla de presupuestos / cotizaciones
-- Creado: 2026-06-03

create table if not exists budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  client_name text not null,
  job_name text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'APPROVED')),
  material_id uuid references inventory_items(id) on delete set null,
  filament_grams numeric default 0,
  print_hours numeric default 0,
  energy_cost numeric default 0,
  labor_cost numeric default 0,
  material_cost numeric default 0,
  total_cost numeric default 0,
  sale_price numeric default 0,
  profit_percent numeric default 0,
  profit_amount numeric default 0,
  margin_percent numeric default 0,
  notes text default '',
  created_at timestamptz default now()
);
