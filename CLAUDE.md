# Ganadería PH — Contexto del Proyecto

## ¿Qué es esto?
Sistema de gestión operativa para engorda de ganado. ERP ganadero multi-rancho con módulos de registro de animales, farmacia, tratamientos, comederos y raciones.

## Stack tecnológico
- **Frontend:** Next.js 14 (App Router) — puerto 3000
- **Backend:** NestJS — puerto 3001
- **ORM:** Prisma
- **DB:** PostgreSQL
- **Deploy:** VPS Linux + Docker

## Monorepo (pnpm workspaces)
```
apps/api/                 → NestJS
apps/web/                 → Next.js
  src/app/(app)/          → espacio escritorio (DIRECTOR / SUPERUSUARIO)
  src/app/operador/       → espacio mobile-first del OPERADOR
packages/database/        → Prisma schema + migraciones (regenerar con pnpm db:generate)
packages/shared/          → Tipos, enums y DTOs compartidos
```

## Comandos para arrancar el proyecto
```bash
# 1. Levantar base de datos (primera vez o después de apagar)
docker compose up -d

# 2. Solo si es primera vez (crea tablas + superusuario)
pnpm db:migrate
pnpm db:seed

# 3. Correr en desarrollo
pnpm dev
```

## Credenciales de desarrollo
- **URL:** http://localhost:3000
- **API Docs (Swagger):** http://localhost:3001/api/docs
- **Email:** admin@ganaderia.ph
- **Password:** Admin1234!

## Estado actual del desarrollo

### ✅ Etapas completadas
- **Etapa 1:** Discovery y documentación completa
- **Etapa 2:** Scaffolding del monorepo (estructura, auth JWT, Prisma, Docker)
- **Etapa 3:** Módulo de Administración (Farmacias, GruposCorrales, Corrales, Usuarios)
- **Etapa 4:** Registro de Animales (CRUD Animal, aretes, `/scan/resolve`, lotes, ficha)
- **Etapa 5:** Farmacia e Inventario (medicamentos, unidades FIFO, salidas temporales, bajas)
- **Etapa 6:** Tratamientos (TratamientoTemplate CRUD, AplicacionTratamiento FIFO + snapshot, /tratamientos, /admin/tratamientos/kits)
- **Etapa 7:** Comederos y Raciones (EstadoComederoConfig, LecturaComedor, RacionDefinicion, SurtidoRacion, /comederos, /raciones, /admin/comederos/estados)
- **Etapa 8:** Dashboard y Reportes (KPIs con caché in-memory, gráfica 30 días, costo por animal, stock crítico, historial tratamientos)
- **Etapa 9:** Módulos transversales y separación de espacios (consolidación DIRECTOR, RacionCatalogo, Notificaciones, espacio operador/ mobile, alta sin corral manual, catálogo medicamentos org-level, dashboard para DIRECTOR, promoción PRE_INGRESO manual)

### 🔜 Siguiente: Etapa 10 — Testing y Calidad
- Tests unitarios (FIFO, costo, resolución de arete, promoción PRE_INGRESO manual, copia de nombre desde catálogo)
- Tests de integración (alta animal, aplicación de tratamiento, ciclo de vida de unidad, emisión + lectura de notificación)
- E2E con Playwright separados por rol DIRECTOR / OPERADOR

## Documentación completa en /docs
| Archivo | Contenido |
|---|---|
| `docs/architecture.md` | Arquitectura completa, módulos, infraestructura, separación `(app)/` vs `operador/` |
| `docs/business-rules.md` | Reglas de negocio por módulo (BR-AN-*, BR-FA-*, BR-TR-*, BR-CO-*, BR-RA-*, BR-US-*, BR-DA-*, BR-NO-*) |
| `docs/db-schema.md` | Prisma schema completo (28 modelos: incluye RacionCatalogo + Notificacion + lecturas) |
| `docs/decisions-log.md` | 24 decisiones técnicas con contexto y razón (DEC-001 → DEC-024) |
| `docs/roadmap.md` | Etapas 1–9 ✅, 10 testing, 11 deploy |
| `docs/ui-system.md` | Sistema de diseño, tokens, componentes, patrones UX (espacios desktop + mobile) |

## Arquitectura de autorización
Tres capas en orden:
1. `JwtAuthGuard` — valida token (rutas públicas marcadas con `@Public()`)
2. `RolesGuard` — valida tipo de usuario (`@RequiereRoles(...)`)
3. `ActividadGuard` — valida módulos permitidos para OPERADOR (`@RequiereActividad(...)`)

**SUPERUSUARIO y DIRECTOR bypasan actividades** (`ROLES_SIN_RESTRICCION` en `actividad.guard.ts`). OPERADOR necesita actividad + GrupoCorrales asignado. El rol `ADMIN` ya no existe; se consolidó en `DIRECTOR` (DEC-018).

## Modelo de inventario (farmacia) — IMPORTANTE
El stock NO se descuenta por aplicación de tratamiento. Cada frasco es una `UnidadMedicamento` con ciclo de vida:
`PRE_INGRESO → DISPONIBLE → SALIDA_TEMPORAL → CONSUMIDO/BAJA`

**Regla de alta (simplificada):** si ya existe cualquier unidad activa del mismo medicamento en esa farmacia (en cualquier estado no terminal) → la nueva unidad entra como `PRE_INGRESO`. Si no existe ninguna → entra directamente como `DISPONIBLE`.

**Promoción manual:** `POST /inventario/promover-preingreso` permite a un DIRECTOR/SUPERUSUARIO promover un batch PRE_INGRESO a DISPONIBLE. Bloqueado con `409 Conflict` si hay una cohorte activa con precio distinto (se debe agotar primero).

Stock decrementado solo cuando el frasco vacío regresa (CONSUMIDO) o se da de baja (ajuste/pérdida).
Ver `docs/business-rules.md` sección BR-FA-* para detalle completo.

## Identificación dual del animal
- **Arete SINIIGA** (amarillo): permanente, legal, único en la organización
- **Arete blanco**: operativo, reutilizable, con historial en tabla `AsignacionAreteBlanco`
- El endpoint `/api/scan/resolve` resuelve cualquier código a animal o corral

## Terminología del dominio
- **GrupoCorrales:** rancho o conjunto de corrales en una ubicación (ej: "Corrales Matriz")
- **Corral:** unidad física individual dentro de un GrupoCorrales
- **Farmacia:** almacén de medicamentos, asignada a uno o varios GrupoCorrales (1:N)
- **Lote:** grupo de animales que llegan juntos el mismo día

## Convenciones de código
- TypeScript strict en todo el proyecto
- Servicios siempre reciben `organizacionId` del usuario autenticado
- Soft deletes: nunca se borra — se desactiva con `activo/activa = false`
- Precios históricos siempre inmutables (guardados al momento de la operación)
- Snapshots de kits al momento de aplicación de tratamiento (JSON en DB)
