# 🖨️ PrintHype v2

**SaaS de gestión para talleres de impresión 3D** — pedidos, inventario, presupuestos con calculadora de costos reales, cola de impresión, IA con tu propia API key y portal público de seguimiento para clientes.

> Hecho para el taller 3D que quiere saber **cuánto gana realmente por cada trabajo**.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| 📊 **Dashboard** | KPIs (pedidos hoy, ROI, stock crítico), gráfico de facturación 6 meses, actividad reciente, insights de IA |
| 📦 **Pedidos** | Tabla con buscador, filtros, export CSV, integración WhatsApp, estados (PENDING → PRINTING → SHIPPED → COMPLETED), acciones batch |
| 🧮 **Presupuestos** | Calculadora de costos: material + energía + depreciación + mano de obra + consumibles + overhead + buffer de fallo, con margen sobre venta |
| 📁 **Inventario** | Materiales con stock en gramos, alertas de reposición (< 200 g), valor total, perfiles de filamento |
| 🗂️ **Proyectos** | Kanban con drag & drop (idea → ready → printing → post → done) |
| 🤖 **AI Lab** | Chat con IA usando **tu propia API key** (BYOK): OpenAI, Groq, Gemini, DeepSeek, OpenRouter o Ollama local. Calculador de costos STL, generador de contenido viral, scripting Python |
| 📢 **Viral Cockpit** | Métricas de contenido, mejor horario de publicación, cola de campañas |
| 🖨️ **Monitoreo de impresoras** | Estado en vivo vía Moonraker (Klipper): temperatura, progreso de impresión |
| 🔗 **Seguimiento público** | Link `/track/[token]` para que el cliente vea el progreso de su pedido |
| 💳 **Billing** | Planes Free / Basic / Pro con MercadoPago (ARS) |
| 📱 **PWA** | Instalable, con página offline |

---

## 🧰 Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **UI:** Tailwind CSS + Lucide icons (tema dark cyberpunk-industrial)
- **Base de datos:** Supabase Postgres (RLS multi-tenant por `user_id`)
- **Auth:** Supabase Auth (email/password + invitaciones por token)
- **Billing:** MercadoPago
- **Impresoras:** Moonraker API (Klipper)
- **Tests:** Playwright + Lighthouse CI

---

## 🚀 Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → completar NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY

# 3. Crear las tablas en Supabase
# Opción A (recomendada): SQL Editor de Supabase → ejecutar cada archivo de supabase/migrations/ en orden
# Opción B: npx supabase link --project-ref TU_REF && npx supabase db push

# 4. Levantar el dev server
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

---

## 🔐 Seguridad

- **RLS multi-tenant:** cada usuario solo ve/edita sus propias filas (`auth.uid() = user_id`) en todas las tablas de datos.
- **API keys de IA por usuario (BYOK):** se guardan en `user_ai_config` (solo accesible vía API autenticada), **nunca se devuelven completas al navegador** (enmascaradas) y no se pisán al guardar sin escribir una nueva.
- **Service role** solo se usa server-side (rutas API); el browser nunca toca la DB directa con permisos ampliados.
- El portal público de seguimiento expone **solo campos públicos** (sin contacto, sin datos del taller).

> ⚠️ Si alguna vez commiteaste credenciales reales (ej: en `_session/`), **rotalas en Supabase** y purgá el historial de Git.

---

## 🧪 Tests

```bash
npx playwright install
npx playwright test          # e2e (auth, dashboard)
npx tsx scripts/test-cost-calculator.mts   # unit de la calculadora de costos
```

---

## 📁 Estructura

```
src/
├── app/
│   ├── api/          # Rutas API (orders, inventory, budgets, ai, billing, track...)
│   ├── dashboard/    # Panel: orders, inventory, projects, ai-lab, viral, billing, settings
│   ├── track/[token] # Portal público de seguimiento
│   ├── login/        # Login/registro
│   └── page.tsx      # Landing
├── components/       # UI (glass cards, tooltips, modales, PDF)
├── config/           # planes.ts (pricing), dictionary.ts
└── lib/              # supabase, costCalculator, billing, moonraker, tracking...
supabase/migrations/  # SQL versionado (RLS incluida)
scripts/              # printer-proxy, herramientas
tests/                # Playwright e2e
```

---

## 🤝 Contribuir / Colaborar

1. Cloná el repo y creá tu rama: `git checkout -b feat/tu-feature`
2. Hacé tus cambios + verificalos con `npm run build`
3. Push y abrí un PR contra `master`

---

Hecho con 🔥 para la comunidad 3D de habla hispana.
