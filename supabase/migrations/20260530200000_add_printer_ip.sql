-- PrintHype v2 — Agregar IP de red para monitoreo de impresoras via Moonraker API
alter table impresoras add column if not exists ip_address text default '';
alter table impresoras add column if not exists port integer default 7125;
