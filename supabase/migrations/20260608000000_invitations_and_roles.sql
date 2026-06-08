-- PrintHype v2 — Sistema de Invitaciones y Roles de Usuario
-- Creado: 2026-06-08

-- 1. Tabla de roles de usuario
create table if not exists user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'admin', 'member', 'guest'
  created_at timestamptz default now(),
  unique(user_id)
);

-- Habilitar RLS en roles
alter table user_roles enable row level security;

create policy "Users can read their own role"
  on user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view and edit all roles"
  on user_roles for all
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

-- 2. Tabla de invitaciones/tokens de acceso especial
create table if not exists user_invitations (
  id uuid default gen_random_uuid() primary key,
  email text unique, -- Si es específica para un correo, opcional
  token text not null unique,
  role text not null default 'member',
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Habilitar RLS en invitaciones
alter table user_invitations enable row level security;

create policy "Admins can manage invitations"
  on user_invitations for all
  to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

create policy "Anonymous can read/use active invitations via token check"
  on user_invitations for select
  using (used = false and expires_at > now());
