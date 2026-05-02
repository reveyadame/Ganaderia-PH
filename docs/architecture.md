# Arquitectura del Sistema — Ganadería PH

## Resumen Ejecutivo

Sistema de gestión operativa para engorda de ganado. Arquitectura web full-stack con separación clara entre frontend (Next.js), backend (NestJS) y base de datos (PostgreSQL). Monorepo pnpm workspaces con paquete compartido de tipos. Deploy en VPS Linux con Docker.

**Estado:** Etapas 1–8 completadas. Todos los módulos operativos implementados.

---

## Estructura del Monorepo

```
ganaderia-ph/
├── apps/
│   ├── web/                    # Next.js 14 (App Router) — puerto 3000
│   └── api/                    # NestJS — puerto 3001
├── packages/
│   ├── shared/                 # Tipos, enums, interfaces compartidas
│   └── database/               # Prisma schema + migraciones + seed
├── docs/                       # Documentación técnica completa
├── docker-compose.yml          # Dev: Postgres 16 + Redis 7
├── docker-compose.prod.yml     # Prod: Nginx + Web + API + Postgres + Redis
├── .env.example
└── CLAUDE.md                   # Contexto para sesiones de desarrollo con IA
```

---

## Frontend — Next.js 14 (App Router)

### Stack

| Tecnología | Uso |
|---|---|
| Next.js 14 App Router | Framework principal, typedRoutes habilitado |
| Plus Jakarta Sans | Tipografía principal (400/500/600/700) |
| JetBrains Mono | Tipografía mono (códigos, IDs) |
| TailwindCSS | Estilos con sistema de tokens HSL semánticos |
| TanStack Query v5 | Fetching y caché de datos del servidor |
| Zustand + persist | Estado cliente (sesión en localStorage) |
| Lucide React | Íconos exclusivamente |
| Recharts | Gráficas (AreaChart en dashboard) |
| html5-qrcode | Escaneo desde cámara (Code 128, QR) |
| date-fns | Formateo de fechas |

### Rutas implementadas

```
apps/web/src/app/
├── (auth)/
│   └── login/                        ✅ Login JWT
└── (app)/
    ├── layout.tsx                     ✅ Auth guard + sidebar colapsable + mobile topbar
    ├── dashboard/                     ✅ KPIs, gráfica 30 días, stock crítico, resumen grupos
    ├── animales/                      ✅ Listado, nueva llegada, ficha
    │   ├── page.tsx
    │   ├── nuevo/page.tsx
    │   └── [id]/page.tsx
    ├── tratamientos/                  ✅ Aplicación mobile-first (scan → kit → preview → éxito)
    ├── comederos/                     ✅ Scan corral → estado con colores → confirmación
    ├── raciones/                      ✅ Landing
    │   ├── definir/page.tsx           ✅ Admin define kg por grupo/corral
    │   └── surtir/page.tsx            ✅ Operador escanea + turno + diferencia
    ├── farmacia/                      ✅ Overview con KPIs y accesos rápidos
    │   ├── medicamentos/page.tsx      ✅ CRUD
    │   ├── inventario/page.tsx        ✅ Unidades, alta FIFO, bajas
    │   └── salidas/page.tsx           ✅ Salidas temporales y regresos
    ├── reportes/
    │   ├── animales/page.tsx          ✅ Costo por animal
    │   └── tratamientos/page.tsx     ✅ Historial tratamientos
    └── admin/
        ├── farmacias/                 ✅ CRUD
        ├── corrales/                  ✅ CRUD grupos y corrales
        ├── aretes/                    ✅ Pool de aretes blancos
        ├── tratamientos/kits/         ✅ CRUD kits de tratamiento
        ├── comederos/estados/         ✅ CRUD estados con color picker
        └── usuarios/                  ✅ CRUD + modal de permisos
```

### Componentes UI base (`components/ui/`)

`Button` · `Input` · `Select` · `Badge` · `ActiveBadge` · `Dialog` · `ConfirmDialog` · `EmptyState` · `PageHeader` · `Skeleton` · `TableSkeleton` · `Toast` · `ToastProvider`

### Componentes de escaneo (`components/scanner/`)

- **`BarcodeInput`** — input unificado para escáner Bluetooth/USB + manual + cámara
- **`CameraScanner`** — overlay pantalla completa, import dinámico SSR-safe, vibración háptica
- **`ScanResultAnimalCard`** — tarjeta de resultado con aretes, ubicación, costo acumulado

### Sistema de diseño

Tokens HSL en `globals.css` con variantes light/dark. Colores semánticos: `brand`, `accent`, `success`, `warning`, `danger`, `info` — cada uno con variantes `DEFAULT`, `subtle`, `foreground`. Ver `docs/ui-system.md` para referencia completa.

### Auth Guard (`(app)/layout.tsx`)

```typescript
// Secuencia de hidratación SSR-safe con Zustand persist:
1. Render: hydrated=false → spinner
2. useEffect: hydrated=true + leer sidebar-collapsed de localStorage
3. useEffect: si hydrated && !accessToken → router.replace('/login')
4. Render: si !accessToken → null (previene flash)
5. Render: sidebar + main content

// Estado del sidebar:
collapsed: boolean  → localStorage 'sidebar-collapsed'
mobileOpen: boolean → estado local (reset en cada mount)
```

### API Client (`lib/api/client.ts`)

- Lee token de `localStorage.getItem('access_token')`
- **Interceptor 401**: limpia `access_token` y `ganaderia-auth` de localStorage, redirige a `/login` con `window.location.replace`
- El auth store (`stores/auth.store.ts`) usa Zustand `persist` con `name: 'ganaderia-auth'` y copia manual del token en `access_token` para el cliente

---

## Backend — NestJS

### Stack

| Tecnología | Uso |
|---|---|
| NestJS | Framework principal |
| Prisma | ORM |
| passport-jwt | Autenticación JWT |
| class-validator | Validación de DTOs |
| Swagger | Docs API en `/api/docs` |
| bcryptjs | Hash de contraseñas (rounds=12) |

### Módulos implementados

```
apps/api/src/modules/
├── auth/                  ✅ Login JWT, @Public(), JwtStrategy
├── usuarios/              ✅ CRUD + actividades + grupos (transaccional)
├── farmacias/             ✅ CRUD
├── grupos-corrales/       ✅ CRUD
├── corrales/              ✅ CRUD
├── animales/              ✅ CRUD + egreso + liberarArete + lotes
├── aretes/                ✅ Pool, alta individual/lote, disponibles
├── scan/                  ✅ POST /scan/resolve (con racionActiva + ultimaLectura)
├── medicamentos/          ✅ Catálogo por farmacia, soft delete
├── inventario/            ✅ Alta FIFO, salidas temporales, regresos, bajas
├── tratamientos/          ✅ Templates (kits), aplicaciones, preview costo
├── comederos/             ✅ Lecturas, estado actual por grupo
├── raciones/              ✅ Definiciones, surtido, historial
└── dashboard/             ✅ KPIs con caché, resumen grupos, tratamientos/día
```

### Infraestructura de autorización (3 capas globales en `APP_GUARD`)

```
Request
  → JwtAuthGuard      valida token JWT. Rutas sin auth: @Public()
  → RolesGuard        valida TipoUsuario con @RequiereRoles(...)
  → ActividadGuard    valida actividad del OPERADOR con @RequiereActividad(...)
                      SUPERUSUARIO, ADMIN y DIRECTOR bypasan actividades
  → Handler
```

**Decoradores custom:**
- `@Public()` — ruta pública sin token
- `@RequiereRoles(...roles)` — restringe por TipoUsuario
- `@RequiereActividad(...actividades)` — restringe por módulo asignado
- `@CurrentUser()` — inyecta `UsuarioSesion` en el parámetro

### AuditInterceptor

Interceptor global que registra en `AuditLog` todas las mutaciones (POST/PUT/PATCH/DELETE). No bloquea el flujo si falla.

---

## Endpoint Central: POST /scan/resolve

```
POST /api/scan/resolve
Body: { "codigo": string, "contexto": "ANIMAL" | "CORRAL" | "AMBOS" }

Lógica (código normalizado a UPPERCASE):
  1. Animal.areteSiniiga     (coincidencia exacta, estado ACTIVO)
  2. AsignacionAreteBlanco   (areteBlanco.codigo = input, fechaLiberacion IS NULL)
  3. Corral.codigo           (solo si contexto incluye CORRAL, corral activo)
  4. NO_ENCONTRADO

Respuesta para ANIMAL: datos + costoAcumulado + tratamientosCount
Respuesta para CORRAL: datos + animalesCount + racionActiva + ultimaLectura
```

---

## Base de Datos — PostgreSQL 16

Gestionada con Prisma. Schema completo en `docs/db-schema.md`.

### Índices críticos

| Índice | Propósito |
|---|---|
| `Animal.areteSiniiga` | Lookup por escaneo |
| `AsignacionAreteBlanco(areteBlancoId, fechaLiberacion)` | Resolución de arete activo |
| `AreteBlanco(organizacionId, codigo)` | Lookup por escaneo |
| `Corral.codigo` | Lookup por escaneo de corral |
| `UnidadMedicamento(medicamentoId, farmaciaId, estado, fechaEntrada)` | FIFO queries |
| `AplicacionTratamiento(animalId, fechaAplicacion)` | Historial clínico |
| `LecturaComedor(corralId, fechaLectura)` | Historial por corral |

---

## Cálculo de Costo Acumulado por Animal

```
costoAcumulado = SUM(AplicacionTratamiento.costoTotalCalculado WHERE animalId = :id)

costoTotalCalculado = SUM(AplicacionTratamientoItem.costoItemCalculado)

costoItemCalculado = dosisAplicada × costoPorMedidaMomento
```

`costoPorMedidaMomento` es **inmutable**: se guarda al momento de aplicar el tratamiento y nunca cambia. El valor se toma de la `UnidadMedicamento` DISPONIBLE más antigua (FIFO) de la farmacia del GrupoCorrales del animal.

En el listado de animales, los costos se calculan con `groupBy + _sum` en query adicional — no N+1.

---

## Infraestructura

### Docker Compose desarrollo
```yaml
# docker-compose.yml
postgres:  PostgreSQL 16 — puerto 5432
redis:     Redis 7 — puerto 6379
```

### Docker Compose producción
```yaml
# docker-compose.prod.yml
nginx:     Reverse proxy + SSL (Certbot)
web:       Next.js — puerto 3000
api:       NestJS — puerto 3001
postgres:  PostgreSQL 16
redis:     Redis 7
```

### Variables de entorno requeridas
```env
DATABASE_URL=postgresql://user:pass@postgres:5432/ganaderia_ph
JWT_ACCESS_SECRET=<64 bytes hex>
JWT_REFRESH_SECRET=<64 bytes hex>
REDIS_URL=redis://redis:6379
FRONTEND_URL=https://tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```

### Comandos de desarrollo
```bash
docker compose up -d      # Inicia Postgres y Redis
pnpm db:generate          # Genera cliente Prisma desde el schema
pnpm db:migrate           # Ejecuta migraciones pendientes
pnpm db:seed              # Crea superusuario y datos base
pnpm dev                  # Levanta API (3001) y Web (3000) en paralelo
```

### Notas de compilación (monorepo)

- `packages/shared` debe compilarse antes de correr el API: `pnpm --filter @ganaderia/shared build`
- `apps/api/nest-cli.json` tiene `"entryFile": "apps/api/src/main"` para que el output TypeScript en `dist/` encuentre el entrypoint correcto
- `apps/api/src/app.module.ts` carga `.env` con `envFilePath: ['../../.env', '.env']` para resolver desde el root del monorepo
