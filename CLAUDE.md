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
apps/api/        → NestJS
apps/web/        → Next.js
packages/database/ → Prisma schema + migraciones
packages/shared/   → Tipos, enums y DTOs compartidos
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

### 🔜 Siguiente: Etapa 8 — Dashboard y Reportes
- KPI cards con caché Redis (animales activos, costo promedio, stock crítico, tratamientos recientes)
- Reportes: costo por animal, stock farmacia, historial tratamientos, consumo comedero, diferencias surtido
- Gráficas con Recharts
- Dashboard drill-down: KPI → grupo → corral → animal

## Documentación completa en /docs
| Archivo | Contenido |
|---|---|
| `docs/architecture.md` | Arquitectura completa, módulos, infraestructura |
| `docs/business-rules.md` | Todas las reglas de negocio por módulo |
| `docs/db-schema.md` | Prisma schema completo con 24 modelos |
| `docs/decisions-log.md` | 10 decisiones técnicas con contexto y razón |
| `docs/roadmap.md` | 10 etapas de desarrollo con entregables |
| `docs/ui-system.md` | Sistema de diseño, tokens, componentes, patrones UX |

## Arquitectura de autorización
Tres capas en orden:
1. `JwtAuthGuard` — valida token (rutas públicas marcadas con `@Public()`)
2. `RolesGuard` — valida tipo de usuario (`@RequiereRoles(...)`)
3. `ActividadGuard` — valida módulos permitidos para OPERADOR (`@RequiereActividad(...)`)

SUPERUSUARIO y ADMIN bypasan actividades. OPERADOR necesita actividad + GrupoCorrales asignado.

## Modelo de inventario (farmacia) — IMPORTANTE
El stock NO se descuenta por aplicación de tratamiento. Cada frasco es una `UnidadMedicamento` con ciclo de vida:
`PRE_INGRESO → DISPONIBLE → SALIDA_TEMPORAL → CONSUMIDO/BAJA`

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
