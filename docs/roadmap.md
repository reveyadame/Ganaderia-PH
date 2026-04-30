# Roadmap de Desarrollo — Ganadería PH

Documento de planificación por etapas. Cada etapa tiene entregables concretos, criterios de aceptación y dependencias.

---

## Estado actual
**Fase:** Etapa 7 completada → Iniciando Etapa 8 (Dashboard y Reportes)
**Última actualización:** 2026-04-30

---

## Etapa 1 — Discovery y Levantamiento ✅ COMPLETADO

### Entregables
- [x] Análisis del dominio de negocio (engorda de ganado)
- [x] Riesgos técnicos identificados (concurrencia de stock, arete reutilizable, offline)
- [x] Reglas de negocio documentadas (30+ reglas en `business-rules.md`)
- [x] Modelo de datos definido (24 modelos Prisma)
- [x] Decisiones técnicas registradas (10 decisiones en `decisions-log.md`)
- [x] Arquitectura del sistema definida
- [x] Stack tecnológico confirmado

---

## Etapa 2 — Scaffolding del Proyecto ✅ COMPLETADO

### Entregables
- [x] Monorepo pnpm workspaces (`apps/api`, `apps/web`, `packages/database`, `packages/shared`)
- [x] `packages/database` — Prisma schema completo (24 modelos), seed con superusuario y datos base
- [x] `packages/shared` — Enums, tipos de sesión, tipos de API y Scanner compartidos
- [x] `apps/api` — NestJS base con auth JWT, 3 guards (JwtAuth/Roles/Actividad), PrismaService global, AuditInterceptor, ExceptionFilter, Swagger en `/api/docs`
- [x] `apps/web` — Next.js 14 App Router, login funcional, sidebar con permisos, TanStack Query, Zustand, Tailwind dark mode
- [x] `docker-compose.yml` — Postgres 16 + Redis 7 para desarrollo
- [x] `docker-compose.prod.yml` — Stack completo de producción con Nginx
- [x] `.env.example` documentado
- [x] Decorador `@Public()` para rutas sin autenticación

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

#### Frontend — componentes UI base construidos
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
- [x] CRUD Animal — alta, consulta paginada con filtros (grupo, corral, sexo, estado, búsqueda por arete), egreso con causa
- [x] `PATCH /animales/:id/egreso` — registra causa (VENTA, MUERTE, TRASLADO, OTRO), precio de venta, fecha
- [x] `PATCH /animales/:id/liberar-arete` — solo ADMIN/SUPERUSUARIO
- [x] CRUD AreteBlanco — alta individual y en lote (`POST /aretes/lote`), `GET /aretes/disponibles`
- [x] CRUD Lote — agrupación de llegadas por fecha/procedencia
- [x] `POST /scan/resolve` — resolución universal: SINIIGA → arete blanco activo → código de corral. Normaliza uppercase, retorna costo acumulado y count de tratamientos

#### Frontend — componentes de escaneo
- [x] `BarcodeInput` — captura input de escáner Bluetooth/USB + entrada manual con Enter + botón de cámara integrado
- [x] `CameraScanner` — overlay pantalla completa con `html5-qrcode` (import dinámico, SSR-safe), cámara trasera (`facingMode: environment`), animación de línea de escaneo, manejo de permisos denegados, vibración háptica al detectar código
- [x] `ScanResultAnimalCard` — tarjeta reutilizable de resultado de escaneo con aretes, ubicación y costo acumulado

#### Frontend — páginas
- [x] `/animales` — listado con filtros (grupo, corral, sexo, estado), paginación servidor, egreso inline
- [x] `/animales/nuevo` — registro en 3 pasos: aretes (escaneo cámara/Bluetooth/manual) → datos → ubicación/lote
- [x] `/animales/[id]` — ficha completa con aretes, datos, costo acumulado destacado, historial de tratamientos
- [x] `/admin/aretes` — pool de aretes blancos con stats, alta individual/lote, tabla con animal asignado actual

### Criterios cumplidos
- Operador registra un animal con escaneo desde cámara del teléfono o lector Bluetooth
- La ficha muestra arete blanco actual, SINIIGA, costo acumulado e historial de tratamientos
- Admin libera arete blanco desde la ficha del animal egresado
- `/scan/resolve` normaliza el código a mayúsculas y busca en SINIIGA → arete blanco activo → corral

---

## Etapa 5 — Módulo de Farmacia e Inventario ✅ COMPLETADO
**Dependencia:** Etapa 3
**Estado:** ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD Medicamento — `MedicamentosModule`: catálogo por farmacia con nombre, presentación, volumen, unidad, stock mínimo; soft delete; validación de duplicado por nombre en misma farmacia
- [x] Alta de `UnidadMedicamento` — `POST /inventario/alta`: calcula `costoPorMedida = costoUnitario / volumenPresentacion`; si hay DISPONIBLES del mismo medicamento → entra como PRE_INGRESO (FIFO) — BR-FA-002
- [x] Promoción automática PRE_INGRESO → DISPONIBLE — `promoverPreIngreso()` se ejecuta al cambiar unidad a CONSUMIDO o BAJA; promueve la unidad PRE_INGRESO más antigua — BR-FA-003
- [x] `POST /inventario/salidas` — crea `SalidaTemporal`, cambia unidad a SALIDA_TEMPORAL; valida que médico existe y que unidad esté DISPONIBLE
- [x] `PATCH /inventario/salidas/:id/regreso` — regreso vacío (→ CONSUMIDO) o con contenido (→ DISPONIBLE); dispara promoción si aplica
- [x] `POST /inventario/bajas` — crea `BajaMedicamento`; justificación obligatoria para AJUSTE, PERDIDA, ROBO, DANO — BR-FA-008
- [x] `GET /inventario/stock` — resumen de stock por medicamento con conteo de DISPONIBLE/SALIDA_TEMPORAL/PRE_INGRESO y flag `alerta` si `stockOperativo <= stockMinimo`
- [x] `GET /inventario/unidades` — listado paginado con filtros por medicamento y estado

#### Frontend
- [x] `/farmacia` — overview: selector de farmacia, KPI cards (medicamentos, disponibles, en campo, alertas), accesos rápidos, tabla de stock por medicamento
- [x] `/farmacia/medicamentos` — CRUD completo: tabla con stock inline, modal de alta/edición, confirmación de soft delete
- [x] `/farmacia/inventario` — listado de unidades con filtro por medicamento/estado, modal de alta con cálculo de costo/medida en tiempo real, modal de baja con justificación condicional
- [x] `/farmacia/salidas` — listado de salidas con filtro abierta/cerrada, modal de nueva salida (selección de medicamento → unidad disponible → médico), modal de regreso con selector visual vacío/con contenido

### Criterios cumplidos
- Alta de unidad con stock existente → entra como PRE_INGRESO (verificado en aviso UI)
- Al consumir todas las unidades anteriores → PRE_INGRESO promovido automáticamente a DISPONIBLE
- Justificación requerida para AJUSTE, PERDIDA, ROBO, DANO — validado en backend y frontend
- Las alertas de stock mínimo aparecen en el overview de farmacia

---

## Etapa 6 — Módulo de Tratamientos ✅ COMPLETADO
**Dependencia:** Etapas 4 y 5
**Estado:** ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD `TratamientoTemplate` (kits con items: medicamento + dosis + unidad + orden) — `POST/GET/PUT/DELETE /tratamiento-templates`
- [x] Registro de `AplicacionTratamiento` — por kit (snapshot JSON inmutable) o individual, costo FIFO de unidad más antigua (DISPONIBLE/SALIDA_TEMPORAL) de la farmacia del GrupoCorrales del animal
- [x] `POST /tratamientos/preview-costo` — costo estimado antes de confirmar (retorna `sinStock: true` si no hay unidad disponible)
- [x] `GET /tratamientos?animalId=` — historial de tratamientos de un animal

#### Frontend
- [x] `/admin/tratamientos/kits` — CRUD de kits: listado de cards, modal crear/editar con selector farmacia→medicamento→dosis, soft delete
- [x] `/tratamientos` — pantalla de aplicación mobile-first en 4 pasos: scan → selección (kit o individual) → preview costo → éxito
- [x] Sidebar actualizado: "Kits de tratamiento" en ADMINISTRACIÓN

### Criterios cumplidos
- Operador escanea arete, selecciona kit y confirma en ≤3 taps
- El costo calculado usa precio FIFO de la farmacia asignada al corral del animal
- Cambios futuros al kit no afectan tratamientos históricos (snapshot inmutable en `templateSnapshot` JSON)

---

## Etapa 7 — Módulo de Comederos y Raciones ✅ COMPLETADO
**Dependencia:** Etapa 4
**Estado:** ✅ COMPLETADO

### Entregables

#### Backend
- [x] CRUD `EstadoComederoConfig` — catálogo por organización (nombre, orden, color hex). Soft delete si tiene lecturas (BR-CO-003)
- [x] Registro de `LecturaComedor` — cualitativa: corral + estadoConfigId + notas. Valida estado activo y organización
- [x] CRUD `RacionDefinicion` — `POST /raciones/definir` cierra la activa anterior automáticamente (BR-RA-001)
- [x] Registro de `SurtidoRacion` — `POST /raciones/surtir`: turno MANANA|TARDE, resuelve ración activa, copia cantidadDefinida, calcula diferencia (BR-RA-004, BR-RA-005)
- [x] `GET /comederos/estado-actual?grupoCorralesId=` — última lectura + ración activa de cada corral del grupo
- [x] `/scan/resolve` extendido — retorna `racionActiva` (cantidadKgManana + cantidadKgTarde) y `ultimaLectura` al escanear corral

#### Frontend
- [x] `/admin/comederos/estados` — CRUD: color picker con paleta + hex custom, orden configurable
- [x] `/comederos` — scan de corral → botones grandes coloreados por estado → confirmación (≤2 taps); dashboard grilla coloreada por GrupoCorrales abajo
- [x] `/raciones` — landing con dos opciones: Surtir y Definir
- [x] `/raciones/definir` — admin selecciona grupo/corral, total kg con slider 50/50 editable, barra visual, alerta de ración activa existente
- [x] `/raciones/surtir` — operador escanea corral → turno sugerido por hora (<14:00 MANANA, ≥14:00 TARDE), cantidad preset, diferencia calculada

### Criterios cumplidos
- Admin configura estados con colores y el operador los ve como botones de colores al escanear
- Lectura y surtido son independientes (diferentes rutas, diferentes actividades de acceso)
- Admin define 50/50 por defecto, ajustable; barra visual muestra distribución
- Operador escanea → ve turno sugerido + cantidad → diferencia calculada en tiempo real
- Dashboard grilla muestra todos los corrales de un grupo coloreados según última lectura

---

## Etapa 8 — Dashboard y Reportes
**Dependencia:** Etapas 4–7

### Entregables

#### Backend
- [ ] Endpoint de KPIs (caché Redis TTL 5 min): animales activos, costo promedio, stock crítico, tratamientos recientes
- [ ] Reporte: costo acumulado por animal (paginado, filtrable)
- [ ] Reporte: stock actual de farmacia
- [ ] Reporte: historial de tratamientos por período/animal/corral
- [ ] Reporte: consumo de comedero por corral y período
- [ ] Reporte: diferencias de surtido de ración

#### Frontend
- [ ] Dashboard KPI cards + gráficas (Recharts)
- [ ] Tabla de costo por animal (drill-down a ficha)
- [ ] Alertas de stock mínimo destacadas

### Criterios de aceptación
- Director ve dashboard consolidado de todos los grupos de corrales
- Puede profundizar desde KPI → grupo → corral → animal individual

---

## Etapa 9 — Testing y Calidad
**Dependencia:** Etapas 2–8

### Entregables
- [ ] Tests unitarios en lógica crítica: FIFO, cálculo de costo, resolución de arete, promoción PRE_INGRESO
- [ ] Tests de integración en flujos críticos: alta de animal, aplicación de tratamiento, ciclo de vida de unidad
- [ ] Tests E2E con Playwright: flujo completo registro → tratamiento → egreso
- [ ] Revisión de seguridad: guards, inputs, XSS
- [ ] Auditoría de performance: índices, queries N+1

---

## Etapa 10 — Deploy en VPS Linux
**Dependencia:** Etapa 9

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
| App móvil nativa | React Native reutilizando API NestJS | v1.0 estable |
| Exportación regulatoria | Reportes SINIIGA/SENASICA | Etapa 8 |
| Notificaciones push | Alertas de stock por WhatsApp/email | Etapa 8 |
| Integración contable | Export a CONTPAQi | Post v1.0 |
