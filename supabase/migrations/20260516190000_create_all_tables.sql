-- PrintHype v2 — Tablas del sistema de gestion JR3D
-- Creado: 2026-05-16

-- 1. Ordenes de produccion
create table if not exists order_registry (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_contact text default '',
  total_price numeric not null,
  item_reference text not null,
  status text default 'PENDING',
  priority text default 'NORMAL',
  inventory_id text,
  units_consumed numeric,
  created_at timestamptz default now()
);

-- 2. Impresoras 3D
create table if not exists impresoras (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'online',
  created_at timestamptz default now()
);

-- 3. Inventario de materiales
create table if not exists inventory_items (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  stock_units numeric default 0,
  unit_price numeric default 0,
  brand text default 'Generico',
  color text default '#FF6600',
  created_at timestamptz default now()
);

-- 4. Tablero de proyectos / Kanban
create table if not exists project_board (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  client text default 'General',
  priority text default 'medium',
  status text default 'idea',
  due_date date,
  progress int default 0,
  created_at timestamptz default now()
);

-- 5. Configuracion global del taller
create table if not exists ajustes (
  id text primary key default 'global',
  moneda text default 'ARS',
  precio_kwh numeric default 120.50,
  margen_ganancia numeric default 1.5,
  precio_hora_laboral numeric default 800,
  ollama_url text default 'http://localhost:11434',
  webhook_url text default '',
  updated_at timestamptz default now()
);

-- Insertar config por defecto
insert into ajustes (id) values ('global')
on conflict (id) do nothing;
