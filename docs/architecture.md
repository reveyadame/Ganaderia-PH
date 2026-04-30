# Arquitectura del Sistema — Ganadería PH

## Resumen Ejecutivo

Sistema de gestión operativa para engorda de ganado. Arquitectura web full-stack con separación clara entre frontend (Next.js), backend (NestJS) y base de datos (PostgreSQL). Monorepo pnpm workspaces con paquete compartido de tipos. Deploy en VPS Linux con Docker.

**Estado:** Etapas 1–4 completadas. Módulos operativos: Auth, Admin, Animales, Aretes, Scanner.

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
| Next.js 14 App Router | Framework principal |
| TailwindCSS | Estilos (dark mode first) |
| TanStack Query v5 | Fetching y caché de datos del servidor |
| Zustand | Estado cliente (sesión, UI global) |
| Lucide React | Íconos |
| Recharts | Gráficas (dashboard — Etapa 8) |
| html5-qrcode | Escaneo de barcodes desde cámara (Code 128, QR, EAN y más) |
| date-fns | Formateo de fechas |

### Rutas implementadas

```
apps/web/src/app/
├── (auth)/login/                     ✅ Login con JWT
└── (app)/
    ├── dashboard/                    ✅ Placeholder — KPIs en Etapa 8
    ├── animales/                     ✅ Listado, nueva llegada, ficha
    │   ├── page.tsx
    │   ├── nuevo/page.tsx
    │   └── [id]/page.tsx
    ├── tratamientos/                 🔜 Etapa 6
    ├── comederos/                    🔜 Etapa 7
    ├── raciones/                     🔜 Etapa 7
    ├── farmacia/                     🔜 Etapa 5
    └── admin/
        ├── farmacias/                ✅ CRUD
        ├── corrales/                 ✅ CRUD grupos y corrales
        ├── aretes/                   ✅ Pool de aretes blancos
        └── usuarios/                 ✅ CRUD + permisos
```

### Componentes UI base (todos en `components/ui/`)
`Button` · `Input` · `Select` · `Badge` · `ActiveBadge` · `Dialog` · `ConfirmDialog` · `EmptyState` · `PageHeader` · `Skeleton` · `TableSkeleton` · `Toast` · `ToastProvider`

### Componentes de escaneo (`components/scanner/`)
- **`BarcodeInput`** — input unificado para escáner Bluetooth/USB (detecta input rápido) + entrada manual con Enter + botón de cámara integrado
- **`CameraScanner`** — overlay pantalla completa. Import dinámico de `html5-qrcode` (SSR-safe). Cámara trasera, animación de línea de escaneo, manejo de permisos denegados, vibración háptica al detectar
- **`ScanResultAnimalCard`** — tarjeta reutilizable de resultado: aretes, sexo, ubicación, costo acumulado

---

## Backend — NestJS

### Stack
| Tecnología | Uso |
|---|---|
| NestJS | Framework principal |
| Prisma | ORM |
| passport-jwt | Autenticación JWT |
| class-validator | Validación de DTOs |
| Swagger | Docs API auto-generadas en `/api/docs` |
| bcryptjs | Hash de contraseñas (rounds=12) |

### Módulos implementados

```
apps/api/src/modules/
├── auth/           ✅ Login JWT, @Public() decorator, JwtStrategy
├── usuarios/       ✅ CRUD + actividades + grupos (transaccional)
├── farmacias/      ✅ CRUD
├── grupos-corrales/✅ CRUD
├── corrales/       ✅ CRUD
├── animales/       ✅ CRUD + egreso + liberarArete + lotes
├── aretes/         ✅ Pool, alta individual/lote, disponibles
├── scan/           ✅ POST /scan/resolve
├── medicamentos/   🔜 Etapa 5
├── inventario/     🔜 Etapa 5
├── tratamientos/   🔜 Etapa 6
├── comederos/      🔜 Etapa 7
├── raciones/       🔜 Etapa 7
└── dashboard/      🔜 Etapa 8
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

**Decoradores custom disponibles:**
- `@Public()` — ruta pública sin token
- `@RequiereRoles(...roles)` — restringe por TipoUsuario
- `@RequiereActividad(...actividades)` — restringe por módulo asignado
- `@CurrentUser()` — inyecta `UsuarioSesion` completa en el parámetro

### AuditInterceptor
Interceptor global que registra en `AuditLog` todas las mutaciones (POST/PUT/PATCH/DELETE) del usuario autenticado. No bloquea el flujo si falla.

---

## Endpoint Central: POST /scan/resolve

El endpoint más crítico del sistema. Usado por todos los módulos de campo (tratamientos, comederos, raciones). Resuelve cualquier código escaneado a su entidad.

```
POST /api/scan/resolve
Body: { "codigo": string, "contexto": "ANIMAL" | "CORRAL" | "AMBOS" }

Lógica (el código se normaliza a UPPERCASE antes de buscar):
  1. Animal.areteSiniiga     (coincidencia exacta, estado ACTIVO)
  2. AsignacionAreteBlanco   (areteBlanco.codigo = input, fechaLiberacion IS NULL)
  3. Corral.codigo           (solo si contexto incluye CORRAL, corral activo)
  4. NO_ENCONTRADO

Respuesta incluye:
  - Para ANIMAL: datos completos + costoAcumulado + tratamientosCount
  - Para CORRAL: datos + animalesCount + racionActiva
```

---

## Base de Datos — PostgreSQL 16

Gestionada con Prisma. Schema completo en `docs/db-schema.md`.

### Índices críticos
| Índice | Propósito |
|---|---|
| `Animal.areteSiniiga` | Lookup por escaneo |
| `AsignacionAreteBlanco(areteBlancoId, fechaLiberacion)` | Resolución de arete activo |
| `AreteBlanco(organizacionId, codigo)` | Lookup por escaneo de arete blanco |
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

`costoPorMedidaMomento` es **inmutable**: se guarda al momento de aplicar el tratamiento y nunca cambia aunque el precio del medicamento cambie después. El valor se toma de la `UnidadMedicamento` DISPONIBLE más antigua (FIFO) de la farmacia del GrupoCorrales del animal.

En el listado de animales, los costos se calculan con un `groupBy + _sum` en una query adicional — no N+1.

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
