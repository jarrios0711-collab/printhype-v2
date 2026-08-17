-- PrintHype — Calculadora de costos completa
-- Fecha: 2026-08-17
-- Agrega las columnas que persisten el modelo completo de costos:
--   material + energía + depreciación + mano de obra + consumibles + overhead + buffer de fallo
-- Todas las columnas son opcionales con defaults; el código funciona sin ellas (fallback 42703).

-- 1) Ajustes: parámetros globales de la calculadora
alter table ajustes
    add column if not exists tasa_fallo numeric default 10,              -- % de trabajos fallidos a cotizar
    add column if not exists gastos_por_trabajo numeric default 0;       -- overhead fijo asignado por trabajo

-- 2) Impresoras: perfil de costos (para depreciación + energía reales)
alter table impresoras
    add column if not exists purchase_price numeric default 0,           -- costo de compra en la moneda configurada
    add column if not exists lifetime_hours numeric default 12000,       -- vida útil estimada en horas de impresión
    add column if not exists power_watts numeric default 250;            -- consumo eléctrico medio en watts

-- 3) Budgets: persistir el desglose completo (además de los totales que ya existían)
alter table budgets
    add column if not exists consumables_cost numeric default 0,         -- nozzles, build plates, resinas, lija...
    add column if not exists overhead_cost numeric default 0,            -- gastos fijos asignados
    add column if not exists fail_buffer numeric default 0,              -- buffer de trabajos fallidos
    add column if not exists depreciation_cost numeric default 0;        -- depreciación de máquina por el trabajo

-- Nota: las columnas material_cost, energy_cost (que ahora incluye depreciación+energía),
-- labor_cost, total_cost, sale_price, margin_percent ya existían en budgets.
