-- PrintHype v2 — Fix: agregar campos faltantes
-- Creado: 2026-06-04

-- 1. Agregar peso inicial al inventario (para la barra de stock correcta)
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS initial_weight numeric DEFAULT 1000;

-- Backfill: el peso inicial es el stock actual en materiales existentes
-- (asumimos que no hubo consumo aún en instalaciones nuevas)
UPDATE inventory_items
  SET initial_weight = stock_units
  WHERE initial_weight IS NULL OR initial_weight = 1000;

-- 2. Agregar fecha de entrega a órdenes
ALTER TABLE order_registry
  ADD COLUMN IF NOT EXISTS delivery_date date;

-- 3. Asegurar que stock_deducted existe (ya estaba en la migración original, pero por las dudas)
ALTER TABLE order_registry
  ADD COLUMN IF NOT EXISTS stock_deducted boolean DEFAULT false;
