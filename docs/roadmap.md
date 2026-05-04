# Roadmap de Desarrollo — Ganadería PH

Documento de planificación por etapas. Cada etapa tiene entregables concretos, criterios de aceptación y dependencias.

---

## Estado actual
**Fase:** Etapas 1–8 completadas. Etapa 9 en curso: módulos transversales (Notificaciones, Catálogo de Raciones), separación de espacios `(app)/` desktop y `operador/` mobile, consolidación del rol DIRECTOR.
**Próximo:** Etapa 10 (Testing y Calidad).
**Última actualización:** 2026-05-02

---

## Etapa 1 — Discovery y Levantamiento ✅ COMPLETADO

### Entregables
- [x] Análisis del dominio de negocio (engorda de ganado)
- [x] Riesgos técnicos identificados (concurrencia de stock, arete reutilizable, offline)
- [x] Reglas de negocio documentadas (30+ reglas en `business-rules.md`)
- [x] Modelo de datos definido (24 modelos Prisma)
- [x] Decisiones técnicas registradas (`decisions-log.md`)
- [x] Arquitectura del sistema definida
- [x] Stack tecnológico confirmado

---

## Etapa 2 — Scaffolding del Proyecto ✅ COMPLETADO

### Entregables
- [x] Monorepo pnpm workspaces (`apps/api`, `apps/web`, `packages/database`, `packages/shared`)
- [x] `packages/database` — Prisma schema completo (24 modelos), seed con superusuario y datos base
- [x] `packages/shared` — Enums, tipos de sesión, tipos de API y Scanner compartidos
- [x] `apps/api` — NestJS base con auth JWT, 3 guards (JwtAuth/Roles/Actividad), PrismaService global, AuditInterceptor, ExceptionFilter, Swagger en `/api/docs`
- [x] `apps/web` — Next.js 14 App Router, login funcional, sidebar con permisos, TanStack Query, Zustand, Tailwind
- [x] `docker-compose.yml` — Postgres 16 + Redis 7 para desarrollo
- [x] `docker-compose.prod.yml` — Stack completo de producción con Nginx
- [x] `.env.example` documentado

### Criterios cumplidos
- `pnpm dev` levanta frontend y backend sin errores
- Login funciona y devuelve JWT válido
- SUPERUSUARIO puede hacer login y ver el dashboard

---

## Etapa 3 — Módulo de Administración ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD Farmacia — validación de grupos activos antes de desactivar
- [x] CRUD GrupoCorrales — validación de farmacia activa, bloqueo si tiene animales activos
- [x] CRUD Corral — código uppercase único por grupo, filtro por `grupoCorralesId`
- [x] CRUD Usuario — bcrypt hash, email único
- [x] `PUT /usuarios/:id/actividades` — asignación transaccional de actividades
- [x] `PUT /usuarios/:id/grupos-corrales` — asignación transaccional de grupos

#### Frontend — componentes UI base
- [x] `Button`, `Input`, `Select`, `Badge`, `Dialog`, `ConfirmDialog`
- [x] `EmptyState`, `PageHeader`, `Skeleton`, `TableSkeleton`, `Toast`

#### Frontend — páginas
- [x] `/admin/farmacias` — CRUD con tabla y modales
- [x] `/admin/corrales` — tabs Grupos / Corrales
- [x] `/admin/usuarios` — CRUD + modal de permisos por actividades y grupos

### Criterios cumplidos
- SUPERUSUARIO crea estructura completa de ranchos
- OPERADOR solo ve módulos de sus actividades asignadas

---

## Etapa 4 — Registro de Animales ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD Animal — alta, consulta paginada con filtros, egreso con causa
- [x] `PATCH /animales/:id/egreso` — causa (VENTA, MUERTE, TRASLADO, OTRO), precio de venta, fecha
- [x] `PATCH /animales/:id/liberar-arete` — solo DIRECTOR/SUPERUSUARIO
- [x] CRUD AreteBlanco — alta individual y en lote, `GET /aretes/disponibles`
- [x] CRUD Lote — agrupación de llegadas por fecha/procedencia
- [x] `POST /scan/resolve` — resolución universal con normalización uppercase

#### Frontend — componentes de escaneo
- [x] `BarcodeInput` — Bluetooth/USB + manual + cámara integrada
- [x] `CameraScanner` — overlay pantalla completa, SSR-safe, vibración háptica
- [x] `ScanResultAnimalCard` — tarjeta de resultado reutilizable

#### Frontend — páginas
- [x] `/animales` — listado con filtros y paginación servidor
- [x] `/animales/nuevo` — registro en 3 pasos
- [x] `/animales/[id]` — ficha completa con costo acumulado e historial
- [x] `/admin/aretes` — pool de aretes blancos

### Criterios cumplidos
- Operador registra animal con escaneo desde cámara o lector Bluetooth
- La ficha muestra arete blanco actual, SINIIGA, costo acumulado e historial de tratamientos
- Admin libera arete blanco desde la ficha del animal egresado

---

## Etapa 5 — Módulo de Farmacia e Inventario ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD Medicamento — catálogo por farmacia, soft delete
- [x] Alta `UnidadMedicamento` — FIFO: PRE_INGRESO si hay DISPONIBLES del mismo medicamento
- [x] Promoción automática PRE_INGRESO → DISPONIBLE al consumir todas las anteriores
- [x] `POST /inventario/salidas` — SALIDA_TEMPORAL con validación de médico
- [x] `PATCH /inventario/salidas/:id/regreso` — regreso vacío (CONSUMIDO) o con contenido (DISPONIBLE)
- [x] `POST /inventario/bajas` — justificación obligatoria para AJUSTE, PERDIDA, ROBO, DANO
- [x] `GET /inventario/stock` — resumen con flag `alerta` si `stockOperativo <= stockMinimo`
- [x] `GET /inventario/unidades` — listado paginado con filtros

#### Frontend
- [x] `/farmacia` — overview con KPI cards y accesos rápidos
- [x] `/farmacia/medicamentos` — CRUD completo
- [x] `/farmacia/inventario` — listado de unidades, modal de alta con cálculo costo/medida en tiempo real, modal de baja
- [x] `/farmacia/salidas` — salidas temporales y regresos

### Criterios cumplidos
- Alta con stock existente → entra como PRE_INGRESO (aviso en UI)
- Al consumir todas las anteriores → PRE_INGRESO promovido automáticamente
- Justificación requerida para AJUSTE, PERDIDA, ROBO, DANO

---

## Etapa 6 — Módulo de Tratamientos ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD `TratamientoTemplate` (kits con items: medicamento + dosis + unidad + orden)
- [x] Registro de `AplicacionTratamiento` — por kit (snapshot JSON inmutable) o individual, costo FIFO
- [x] `POST /tratamientos/preview-costo` — costo estimado antes de confirmar (`sinStock: true` si no hay unidad)
- [x] `GET /tratamientos?animalId=` — historial de tratamientos de un animal

#### Frontend
- [x] `/admin/tratamientos/kits` — CRUD de kits (cards + modal con selector farmacia→medicamento→dosis)
- [x] `/tratamientos` — aplicación mobile-first en 4 pasos: scan → selección → preview costo → éxito

### Criterios cumplidos
- Operador escanea arete, selecciona kit y confirma en ≤3 taps
- Costo calculado usa precio FIFO de la farmacia asignada al corral del animal
- Snapshot inmutable en `templateSnapshot` JSON

---

## Etapa 7 — Módulo de Comederos y Raciones ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD `EstadoComederoConfig` — catálogo por organización con color hex, orden. Soft delete si tiene lecturas
- [x] Registro de `LecturaComedor` — corral + estadoConfigId + notas
- [x] CRUD `RacionDefinicion` — `POST /raciones/definir` cierra la activa anterior automáticamente
- [x] Registro de `SurtidoRacion` — turno MANANA|TARDE, ración activa, copia cantidadDefinida, calcula diferencia
- [x] `GET /comederos/estado-actual?grupoCorralesId=` — última lectura + ración activa de cada corral
- [x] `/scan/resolve` extendido — retorna `racionActiva` y `ultimaLectura` al escanear corral

#### Frontend
- [x] `/admin/comederos/estados` — CRUD con color picker (paleta + hex custom) y orden configurable
- [x] `/comederos` — scan de corral → botones grandes coloreados → confirmación (≤2 taps); grilla del grupo
- [x] `/raciones` — landing con opciones Surtir / Definir
- [x] `/raciones/definir` — selector grupo/corral, total kg con slider 50/50 editable, barra visual
- [x] `/raciones/surtir` — scan de corral → turno sugerido por hora → cantidad preset → diferencia calculada

### Criterios cumplidos
- Admin configura estados con colores; operador los ve como botones de colores
- Operador escanea → ve turno sugerido + cantidad → diferencia calculada en tiempo real
- Dashboard grilla muestra todos los corrales del grupo coloreados por última lectura

---

## Etapa 8 — Dashboard, Reportes y UI/UX ✅ COMPLETADO

### Entregables

#### Backend
- [x] Endpoint de KPIs con caché (animalesActivos, costoPromedioAnimal, costoTotalAcumulado, stockCrítico, tratamientosHoy, tratamientosÚltimos7días)
- [x] `GET /dashboard/tratamientos-por-dia?dias=30` — datos de gráfica de área
- [x] `GET /dashboard/resumen-grupos` — resumen por GrupoCorrales con conteo de corrales y animales activos
- [x] Reportes: costo por animal, historial de tratamientos por período/animal/corral
- [x] `GET /reportes/stock-critico` — medicamentos bajo stock mínimo

#### Frontend
- [x] Dashboard con 6 KPI cards (iconos con colores semánticos), alerta de stock crítico, gráfica de área 30 días, resumen por grupos, quick links
- [x] Tablas de reportes: costo por animal (drill-down a ficha), historial tratamientos

#### UI/UX — Rediseño completo
- [x] Sistema de tokens HSL semánticos (light mode default, dark mode disponible)
- [x] Tipografía: Plus Jakarta Sans como fuente principal
- [x] Color accent índigo para estados activos (sidebar, KPI chips)
- [x] Sidebar colapsable (248px ↔ 64px) con persistencia en localStorage
- [x] Responsive: mobile drawer + topbar con hamburger, grids adaptativos
- [x] Interceptor 401 en API client → limpia sesión y redirige a login automáticamente

### Criterios cumplidos
- Director ve dashboard consolidado de todos los grupos de corrales
- KPI cards visibles con iconos diferenciados por color semántico
- Sidebar colapsa a iconos en desktop; drawer en mobile
- Aplicación completamente usable en móvil

---

## Etapa 9 — Módulos transversales y separación de espacios 🚧 EN CURSO

**Dependencia:** Etapas 2–8

### Entregables

#### Backend
- [x] Consolidación rol `ADMIN → DIRECTOR` (mig. `consolidate_director_role`). `ActividadGuard` actualizado: `ROLES_SIN_RESTRICCION = [SUPERUSUARIO, DIRECTOR]` (DEC-018).
- [x] Módulo `notificaciones` — CRUD + lectura + confirmación + DTO de prioridad (DEC-020).
- [x] Modelos `RacionCatalogo` + campo `nombre` en `RacionDefinicion` + FK opcional `catalogoId` (DEC-019).
- [x] Módulo `raciones-catalogo` — CRUD del catálogo por organización.

#### Frontend
- [x] Espacio `operador/` mobile-first separado de `(app)/` desktop (DEC-021): layout, header móvil, home del operador.
- [x] Páginas movidas: `operador/animales/nuevo`, `operador/tratamientos`, `operador/comederos`, `operador/raciones`.
- [x] Alta de animal sin selección de corral — solo grupo, asignación automática (DEC-022).
- [x] `/admin/raciones-catalogo` — CRUD del catálogo de raciones.
- [x] `/admin/notificaciones` — emisión y listado de notificaciones.
- [x] Banner móvil para director cuando entra desde dispositivo pequeño.
- [x] `(app)/raciones/historial` — historial de definiciones por corral.

### Criterios cumplidos
- Director y operador ven dos UIs distintas según su rol.
- Operador no elige corral al registrar; el director puede reasignar después.
- Las raciones se nombran desde el catálogo y mantienen trazabilidad histórica vía `catalogoId`.
- DIRECTOR puede emitir notificaciones críticas con confirmación al OPERADOR.

---

## Etapa 10 — Testing y Calidad
**Dependencia:** Etapa 9

### Entregables
- [ ] Tests unitarios en lógica crítica: FIFO, cálculo de costo, resolución de arete, promoción PRE_INGRESO, copia de nombre desde catálogo
- [ ] Tests de integración en flujos críticos: alta de animal, aplicación de tratamiento, ciclo de vida de unidad, emisión y lectura de notificación
- [ ] Tests E2E con Playwright: flujo completo registro → tratamiento → egreso (rol DIRECTOR y rol OPERADOR por separado)
- [ ] Revisión de seguridad: guards, inputs, XSS
- [ ] Auditoría de performance: índices, queries N+1

---

## Etapa 11 — Deploy en VPS Linux
**Dependencia:** Etapa 10

### Entregables
- [ ] VPS configurado con Docker Compose
- [ ] Nginx con SSL (Certbot / Let's Encrypt)
- [ ] GitHub Actions pipeline: build → test → deploy
- [ ] Backups automáticos PostgreSQL (pg_dump diario, retención 30 días)
- [ ] Monitoreo básico (uptime, logs)
- [ ] Documentación de operación para el cliente

---

## Módulos Futuros (Post v1.0)

| Módulo | Descripción | Dependencia |
|---|---|---|
| Pesajes intermedios | GDP (ganancia diaria de peso) por animal y corral | Etapa 4 |
| Egreso y rentabilidad | Precio de venta vs costo acumulado = margen real | Etapa 6 |
| App móvil nativa | React Native reutilizando API NestJS y el árbol `operador/` | v1.0 estable |
| Exportación regulatoria | Reportes SINIIGA/SENASICA | Etapa 8 |
| Notificaciones push externas | WhatsApp/email/Firebase sobre el modelo `Notificacion` actual | Etapa 9 |
| Integración contable | Export a CONTPAQi | Post v1.0 |
