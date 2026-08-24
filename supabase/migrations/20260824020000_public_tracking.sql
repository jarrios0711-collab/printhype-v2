-- Fase 4: portal publico de seguimiento de pedidos
-- (aplicada a la DB real el 2026-08-24 vía MCP)
alter table order_registry add column if not exists tracking_token text;
create unique index if not exists idx_order_registry_tracking_token on order_registry(tracking_token);

-- Backfill de pedidos existentes (16 hex chars por fila)
do $$
declare r record;
begin
  for r in select id from order_registry where tracking_token is null loop
    update order_registry set tracking_token = lower(encode(gen_random_bytes(8), 'hex')) where id = r.id;
  end loop;
end $$;
