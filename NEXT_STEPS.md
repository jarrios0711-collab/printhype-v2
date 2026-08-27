# PrintHype v2 — Estado y Próximos Pasos
> Última actualización: 2026-08-26
> Este archivo es el "memoria" del proyecto para retomar en cualquier sesión.

---

## ✅ LO COMPLETADO (sesión 2026-08-26)

### Seguridad
- **RLS multi-tenant APLICADO en producción** (`xtshaabpfdqdhwaspdxv` — proyecto "printhype"):
  migración `supabase/migrations/20260826000000_tenant_isolation_complete.sql` ejecutada y verificada
  (15 tablas con RLS ON + políticas por `user_id`).
- **Contraseña del admin rotada** (`admin@jr3d.com`) — la nueva está en el chat de esa sesión.
- **Fuga de credenciales eliminada**: `_session/ESTADO_ACTUAL.md` (tenía la pass vieja) borrado
  del repo Y purgado de todo el historial de git (force push a master, feat/billing-tracking,
  feat/cost-calculator).
- `.env.example` con placeholders (sin claves reales).

### AI Lab (BYOK)
- API keys enmascaradas (GET ya no devuelve la key completa; sentinel `__KEEP__` en POST).
- Validación con `base_url` personalizado + fallback.
- Auth obligatoria en `/api/ai/stream` (401).

### Repo
- README.md completo, `.gitignore` ampliado, `.vercelignore` nuevo.
- HEAD: ver `git log --oneline -10`.

### Deploy (IMPORTANTE)
- **Las env vars de Vercel estaban VACÍAS** → login/registro rotos en producción.
- Se cargaron los valores correctos en Vercel (production/preview/development):
  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL.
- **Redesplegado**: https://printhype-v2.vercel.app — login verificado E2E (303 → /dashboard).
- Ojo: `vercel env add` por CLI guardó valores vacíos en production; se cargaron vía API
  (POST /v9/projects/{id}/env). Usar la API o el dashboard, no `vercel env add` con stdin.

---

## ⏳ PENDIENTE / PRÓXIMOS PASOS

### 1. Rebranding (en curso)
- **"PrintHype" está tomado** (printhype.co.nz NZ, printhype.in India).
- **Candidato recomendado: CapaForge** — dominios LIBRES verificados:
  `capaforge.com` ✅, `capaforge.com.ar` ✅, `capaforge.io` ✅, 0 resultados en GitHub.
- Alternativas: GCodeWorks, Imprimio, FilaFab, 3DForja (ver chat para el detalle).
- Por hacer:
  - [ ] Confirmar nombre con el dueño
  - [ ] Registrar dominios (capaforge.com + .com.ar) — Namecheap/Cloudflare + nic.ar
  - [ ] Chequear Instagram/TikTok (@capaforge)
  - [ ] Rebrand en la app: logo, textos, meta tags, título, README

### 2. Seguridad — limpieza de credenciales compartidas por chat
- [ ] **Revocar el Access Token de Supabase** (`sbp_...` — está en el chat; dashboard → Account
      Settings → Access Tokens → Revoke)
- [ ] **Cambiar la contraseña de la DB** (la que funciona está en el chat; Project Settings →
      Database → Reset database password)

### 3. Funcionalidades
- [ ] **Viral Cockpit**: completar con métricas reales (hoy son datos estáticos/placeholder)
- [ ] **Guest login**: existe `invitado@jr3d.com` en la DB; falta configurar `GUEST_EMAIL` /
      `GUEST_PASSWORD` en Vercel para que "Entrar como Invitado" funcione
- [ ] **MercadoPago**: el scaffolding de billing existe; faltan las keys
      (`MERCADOPAGO_ACCESS_TOKEN`, etc. — ver .env.example)
- [ ] Revisar ramas `feat/billing-tracking` y `feat/cost-calculator` (¿fusionar/cerrar?)
- [ ] `npm audit`: 10 vulnerabilidades reportadas (1 low, 1 moderate, 8 high)

---

## 🔑 MAPA DE SECRETOS (dónde está cada cosa — NO escribir valores acá)

| Secreto | Dónde está |
|---|---|
| Service role key | `.env` local (gitignored) + env de Vercel |
| Anon key | `.env` local + Vercel (pública por diseño) |
| DB password de Supabase | En el chat de la sesión 2026-08-26 |
| Password admin (`admin@jr3d.com`) | En el chat de la sesión 2026-08-26 |
| Token Vercel CLI | `%APPDATA%\xdg.data\com.vercel.cli\auth.json` (local) |

---

## 🛠️ COMANDOS ÚTILES

```powershell
# Dev local
npm run dev

# Build de verificación
npm run build

# Ejecutar SQL en la DB remota (necesita la DB password del chat)
# node script con 'pg' + connection string
# o: supabase db query --db-url "postgresql://postgres.xtshaabpfdqdhwaspdxv:...@aws-1-us-west-1.pooler.supabase.com:5432/postgres" -f <archivo.sql>

# Deploy producción
vercel --prod --yes
```
