-- ============================================================
-- PrintHype v2 — Migración: Multi-tenant (user_id)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna user_id a tablas existentes
ALTER TABLE order_registry ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE project_board ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE impresoras ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE filament_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE viral_campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Índices para queries rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_order_registry_user_id ON order_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_project_board_user_id ON project_board(user_id);
CREATE INDEX IF NOT EXISTS idx_impresoras_user_id ON impresoras(user_id);
CREATE INDEX IF NOT EXISTS idx_filament_profiles_user_id ON filament_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_campaigns_user_id ON viral_campaigns(user_id);

-- 3. Asignar user_id a datos existentes (reemplazar <ADMIN_UUID> con el UUID del admin)
-- Primero obtener el UUID: SELECT id FROM auth.users WHERE email = 'admin@jr3d.com';
-- UPDATE order_registry SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;
-- UPDATE inventory_items SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;
-- UPDATE project_board SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;
-- UPDATE impresoras SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;
-- UPDATE filament_profiles SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;
-- UPDATE viral_campaigns SET user_id = '<ADMIN_UUID>' WHERE user_id IS NULL;

-- 4. Crear tabla para activity log de órdenes (Fase 4)
CREATE TABLE IF NOT EXISTS order_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES order_registry(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crear tabla para historial de chat IA (Fase 3)
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Crear tabla para preferencias de notificaciones (Fase 4)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  on_new_order BOOLEAN DEFAULT true,
  on_status_change BOOLEAN DEFAULT true,
  on_low_stock BOOLEAN DEFAULT true,
  on_budget_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Políticas RLS (recomendado para seguridad en capa DB)
ALTER TABLE order_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE impresoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE filament_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve sus propios datos
CREATE POLICY "users_own_orders" ON order_registry
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_inventory" ON inventory_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_projects" ON project_board
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_printers" ON impresoras
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_filaments" ON filament_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_campaigns" ON viral_campaigns
  FOR ALL USING (auth.uid() = user_id);
