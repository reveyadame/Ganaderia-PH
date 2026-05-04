# Decisions Log

Registro cronológico de todas las decisiones técnicas y de negocio tomadas durante el desarrollo.
Cada entrada incluye contexto, alternativas consideradas y razón de la decisión final.

---

## DEC-001 — Modelo de stock por unidad física (frasco/pieza)
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** El inventario de medicamentos no se descuenta por aplicación de tratamiento. Cada frasco o pieza es una entidad `UnidadMedicamento` con su propio ciclo de vida:
`PRE_INGRESO → DISPONIBLE → SALIDA_TEMPORAL → CONSUMIDO` o `BAJA`

**Alternativas consideradas:**
- Decremento por aplicación (modelo clásico): descarta ML de un stock global al registrar un tratamiento.

**Razón:** Los tratamientos se aplican en campo por múltiples operadores simultáneamente. El modelo clásico genera concurrencia (stock negativo), requiere conectividad constante y no refleja la operación real. El médico lleva frascos físicos al campo; el modelo por unidad física refleja exactamente eso y elimina el problema de concurrencia.

---

## DEC-002 — Gestión de costos FIFO con estado PRE_INGRESO
**Fecha:** 2026-04-29
**Estado:** Aprobado — se implementa en Etapa 5

**Decisión:** Cuando se da de alta una `UnidadMedicamento` con costo diferente al de las unidades actualmente `DISPONIBLE` del mismo medicamento en la misma farmacia, la nueva unidad entra con estado `PRE_INGRESO`. Pasa a `DISPONIBLE` automáticamente cuando todas las unidades anteriores del mismo medicamento en esa farmacia están en `CONSUMIDO` o `BAJA`.

**Alternativas consideradas:**
- Precio promedio ponderado.
- Precio más reciente.

**Razón:** El costo histórico de los tratamientos ya aplicados no debe cambiar retroactivamente. FIFO garantiza que el costo registrado corresponde exactamente al lote que se consumió.

---

## DEC-003 — Relación Farmacia → GrupoCorrales es 1:N
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** Una farmacia puede abastecer a varios GrupoCorrales, pero cada GrupoCorrales solo puede estar asignado a una farmacia. La clave foránea `farmaciaId` vive en `GrupoCorrales`.

**Alternativas consideradas:**
- N:M con tabla intermedia: mayor flexibilidad pero ambigüedad al determinar de qué farmacia tomar el precio FIFO.

**Razón:** El cliente confirmó esta cardinalidad. La relación 1:N elimina ambigüedad en la cadena: animal → corral → grupoCorrales → farmacia → medicamento.

---

## DEC-004 — Snapshot inmutable de kit al momento de aplicación
**Fecha:** 2026-04-29
**Estado:** Aprobado — se implementa en Etapa 6

**Decisión:** Al aplicar un `TratamientoTemplate` (kit), se guarda en `AplicacionTratamiento.templateSnapshot` una copia JSON completa del kit (nombre, medicamentos, dosis) en ese momento.

**Alternativas consideradas:**
- Solo guardar `templateId` y reconstruir desde el log de cambios.

**Razón:** Si el kit cambia en el futuro (se agrega o quita un medicamento), los tratamientos históricos deben reflejar exactamente lo que se usó. El snapshot es la garantía más simple e infalible.

---

## DEC-005 — Costo por aplicación usa la unidad DISPONIBLE más antigua (FIFO)
**Fecha:** 2026-04-29
**Estado:** Aprobado — se implementa en Etapa 6

**Decisión:** Al registrar un tratamiento, el `costoPorMedidaMomento` se toma de la `UnidadMedicamento` con estado `DISPONIBLE` o `SALIDA_TEMPORAL` de fecha de entrada más antigua en la farmacia asignada al GrupoCorrales del animal. Este valor se guarda en `AplicacionTratamientoItem` y es inmutable.

```typescript
const unidadVigente = await prisma.unidadMedicamento.findFirst({
  where: { medicamentoId, farmaciaId, estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] } },
  orderBy: { fechaEntrada: 'asc' }, // más antigua primero = FIFO
})
costoPorMedidaMomento = unidadVigente.costoPorMedida
```

**Razón:** Consistencia con DEC-002. El dato contable no cambia retroactivamente.

---

## DEC-006 — Arete blanco con liberación manual por administrador
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** La liberación del arete blanco de un animal egresado solo puede hacerla un usuario DIRECTOR o SUPERUSUARIO mediante `PATCH /animales/:id/liberar-arete`. No se libera automáticamente al registrar el egreso. (Originalmente `ADMIN`; consolidado en `DIRECTOR` por DEC-018.)

**Razón:** El administrador libera el arete cuando lo recupera físicamente. Eso no siempre ocurre al mismo tiempo que el egreso se registra en el sistema.

---

## DEC-007 — Arquitectura online-first (sin modo offline)
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** El sistema se construye online-first. No se implementan Service Workers ni sincronización offline.

**Alternativas consideradas:**
- Offline-first con IndexedDB + background sync.

**Razón:** El cliente confirmó señal de celular en los corrales. La complejidad de offline-first (resolución de conflictos de inventario, estado divergente entre dispositivos) no está justificada con conectividad confirmada.

---

## DEC-008 — Monorepo pnpm workspaces
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:**
```
apps/web/           Next.js
apps/api/           NestJS
packages/shared/    Tipos, enums — fuente de verdad compartida
packages/database/  Prisma schema + migraciones
```

**Razón:** Permite compartir tipos TypeScript entre frontend y backend. El paquete `shared` es el contrato entre ambas apps. Nota de implementación: los enums de Prisma y los enums de `shared` son string-equivalentes; en servicios NestJS se usa `as` cast donde los tipos difieren por el generador de Prisma.

---

## DEC-009 — Roles sistémicos + actividades + grupos de corrales
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado (revisado en DEC-018)

**Decisión:** Tres capas de autorización en orden de evaluación:
1. `TipoUsuario` (SUPERUSUARIO, ADMIN, DIRECTOR, OPERADOR) — capacidades sistémicas
2. `ActividadUsuario` (REGISTRO, TRATAMIENTOS, COMEDEROS, RACIONES, FARMACIA, REPORTES) — módulos del OPERADOR
3. `GrupoCorrales asignados` — ámbito de datos del OPERADOR

SUPERUSUARIO, ADMIN y DIRECTOR bypasan la capa de actividades.

**Razón:** Representa el modelo operativo real del cliente. Un operador puede tener TRATAMIENTOS en Corrales Matriz y COMEDEROS en Corrales El Álamo, con acceso denegado a todo lo demás.

> **Update 2026-05-01 (DEC-018):** los roles `ADMIN` y `DIRECTOR` se consolidaron en `DIRECTOR`. El enum `TipoUsuario` queda con tres valores: `SUPERUSUARIO`, `DIRECTOR`, `OPERADOR`.

---

## DEC-010 — Sin multi-tenancy (organización única)
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** El sistema opera para una sola organización. El campo `organizacionId` existe en los modelos principales como punto de extensión pero no hay lógica de aislamiento multi-tenant.

**Razón:** El cliente descartó SaaS. `organizacionId` tiene costo mínimo y facilita una migración futura si el negocio cambia de dirección.

---

## DEC-011 — html5-qrcode con import dinámico en useEffect (SSR-safe)
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** La librería `html5-qrcode` se importa dinámicamente dentro de `useEffect` en `CameraScanner`, nunca en el nivel de módulo.

```typescript
useEffect(() => {
  const init = async () => {
    const { Html5Qrcode } = await import('html5-qrcode') // solo en cliente
    const scanner = new Html5Qrcode(ELEMENT_ID)
    await scanner.start({ facingMode: 'environment' }, config, onSuccess, onError)
  }
  init()
  return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop() }
}, [])
```

**Alternativas consideradas:**
- `@zxing/browser` — mejor TypeScript, pero API más compleja para el caso de uso.
- Web Barcode Detection API nativa — sin soporte en iOS Safari.
- `next/dynamic` con `ssr: false` — válido, pero el import dinámico en `useEffect` es igualmente efectivo y más explícito.

**Razón:** `html5-qrcode` tiene el mejor soporte de Code 128 (formato del arete SINIIGA) en cámara de móvil. El import dinámico en `useEffect` garantiza compatibilidad SSR de Next.js sin wrappers adicionales.

---

## DEC-012 — BarcodeInput unificado (teclado + cámara)
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** El componente `BarcodeInput` es el único punto de entrada de códigos en toda la aplicación. Combina:
1. Input de texto para escáneres Bluetooth/USB (simulan teclado; Enter dispara `onScan`)
2. Botón de cámara que abre `CameraScanner` en overlay pantalla completa

El prop `showCamera` (default: `true`) permite desactivar la cámara en contextos de escritorio.

**Razón:** Unifica el contrato de escaneo en un solo componente. Los módulos de tratamientos, comederos y raciones usan `BarcodeInput` sin preocuparse por el origen del código.

---

## DEC-013 — Normalización a UPPERCASE en /scan/resolve
**Fecha:** 2026-04-29
**Estado:** Aprobado e implementado

**Decisión:** `ScanService.resolve()` aplica `codigo.trim().toUpperCase()` antes de cualquier búsqueda.

**Razón:** Los códigos de arete SINIIGA y los códigos de corral son siempre mayúsculas. Los escáneres de cámara y Bluetooth pueden devolver el código en mayúsculas o minúsculas dependiendo del dispositivo. La normalización garantiza consistencia independientemente del hardware.

---

## DEC-014 — Light mode como default (no dark mode)
**Fecha:** 2026-05-01
**Estado:** Aprobado e implementado

**Decisión:** El sistema usa light mode como tema por defecto. El `<html>` no tiene clase `dark` al montar. El sistema de tokens HSL soporta dark mode con la clase `.dark` pero no se activa automáticamente.

**Alternativas consideradas:**
- Dark mode first (original): mejor legibilidad bajo sol directo en campo.

**Razón:** El cliente opera principalmente en oficina y campo con buena iluminación. Light mode se adapta mejor a la mayoría de empresas, genera mayor confianza institucional y es compatible con más contextos de impresión y reportes.

---

## DEC-015 — Sidebar colapsable con persistencia en localStorage
**Fecha:** 2026-05-01
**Estado:** Aprobado e implementado

**Decisión:** El sidebar tiene dos estados: expandido (248px, iconos + labels) y colapsado (64px, solo iconos con tooltip nativo via `title`). El estado se persiste en `localStorage` bajo la clave `sidebar-collapsed`. En mobile, el sidebar es siempre un drawer de 248px controlado por un estado `mobileOpen` local.

**Razón:** Usuarios de oficina en desktop necesitan más espacio para tablas y datos; el sidebar colapsado libera ~248px horizontales. El estado persiste para no obligar al usuario a colapsar en cada sesión.

---

## DEC-016 — Plus Jakarta Sans como tipografía principal
**Fecha:** 2026-05-01
**Estado:** Aprobado e implementado

**Decisión:** Se reemplazó Inter por Plus Jakarta Sans (400/500/600/700) como fuente principal del sistema. JetBrains Mono permanece para código y aretes.

**Alternativas consideradas:**
- Inter: demasiado genérico para un producto de software agropecuario moderno.
- Geist: adecuada pero asociada visualmente a Vercel/Next.js.

**Razón:** Plus Jakarta Sans tiene personalidad geométrica moderna con excelente legibilidad en tamaños pequeños (11–14px) usados en tablas y sidebar. Se diferencia visualmente sin sacrificar profesionalismo. Disponible vía Google Fonts CDN con display: swap.

---

## DEC-017 — Interceptor 401 en API client con redirect automático
**Fecha:** 2026-05-01
**Estado:** Aprobado e implementado

**Decisión:** El API client (`lib/api/client.ts`) detecta respuestas HTTP 401 y ejecuta:
```typescript
localStorage.removeItem('access_token')
localStorage.removeItem('ganaderia-auth')
window.location.replace('/login')
```

**Razón:** Los JWT tienen TTL. Sin este interceptor, un token expirado dejaba al usuario en el dashboard con todas las queries fallando silenciosamente. El interceptor garantiza que cualquier 401 (token expirado, inválido, o sesión revocada) desencadena un logout limpio y redirección inmediata, sin depender de que el usuario recargue manualmente.

---

## DEC-018 — Consolidación de roles ADMIN y DIRECTOR
**Fecha:** 2026-05-01
**Estado:** Aprobado e implementado (mig. `20260501070000_consolidate_director_role`)

**Decisión:** Eliminar el rol `ADMIN` del enum `TipoUsuario`. Las capacidades de gestión por GrupoCorrales que tenía `ADMIN` se fusionan en `DIRECTOR`, que también mantiene su acceso al dashboard consolidado y reportes. El enum queda con tres valores: `SUPERUSUARIO`, `DIRECTOR`, `OPERADOR`.

**Migración de datos:** todos los usuarios con `tipo = 'ADMIN'` se promovieron a `tipo = 'DIRECTOR'`. La migración SQL es idempotente y compatible con el enum nuevo.

**Cambios derivados:**
- `ActividadGuard.ROLES_SIN_RESTRICCION = [SUPERUSUARIO, DIRECTOR]` (antes solo `SUPERUSUARIO`).
- `@RequiereRoles(...)` en controladores: cualquier referencia a `TipoUsuario.ADMIN` se reemplazó por `TipoUsuario.DIRECTOR`.
- Reglas de negocio actualizadas (BR-AN-003, BR-AR-001, BR-FA-005, BR-CO-002, BR-RA-003, BR-US-*).

**Alternativas consideradas:**
- Mantener ambos con permisos diferenciados.

**Razón:** La distinción ADMIN (gestión por grupo) vs DIRECTOR (lectura global) generaba confusión operativa. En el cliente real una misma persona suele cumplir las dos funciones. Reducir a un solo rol simplifica la matriz de permisos y la pantalla de usuarios sin perder granularidad: el alcance se sigue controlando con `UsuarioGrupoCorrales`.

---

## DEC-019 — Catálogo de raciones (RacionCatalogo) separado de cantidades
**Fecha:** 2026-05-02
**Estado:** Aprobado e implementado (mig. `20260502090000_racion_catalogo`)

**Decisión:** Las raciones se nombran a partir de un catálogo (`RacionCatalogo`) por organización. `RacionDefinicion` gana un campo `nombre String` (mig. `racion_nombre`) y un FK opcional `catalogoId` a la entrada del catálogo. Las cantidades por turno (`cantidadKgManana`, `cantidadKgTarde`) **siguen viviendo en `RacionDefinicion`**, no en el catálogo.

**Backfill:** la migración `20260502090000_racion_catalogo` crea entradas de catálogo a partir de los nombres distintos de raciones existentes y enlaza las definiciones por nombre + organización.

**Alternativas consideradas:**
- Catálogo con cantidades default por receta: descartado porque las cantidades varían por corral y por estado del comedero — son decisión del director, no de la receta.
- Lista enum cerrada: descartado, cada cliente quiere personalizar nombres.

**Razón:** En operación los nombres de ración se repiten ("Engorda fase 2", "Crecimiento") y antes se escribían a mano por corral con typos. El catálogo unifica nomenclatura y abre la puerta a futuras métricas por receta sin acoplar el flujo de definición de cantidades.

---

## DEC-020 — Notificaciones internas DIRECTOR → OPERADOR
**Fecha:** 2026-05-02
**Estado:** Aprobado e implementado (mig. `20260502070000_add_notificaciones`)

**Decisión:** Sistema de notificaciones internas con tres modelos: `Notificacion` (cabecera), `NotificacionDestinatario` (lista explícita por usuario) y `NotificacionLectura` (eventos `leidaEn` y `confirmadaEn` por destinatario). Solo DIRECTOR y SUPERUSUARIO emiten. Prioridades: `INFO`, `AVISO`, `CRITICA`.

**Alternativas consideradas:**
- Push notifications nativas: fuera de alcance v1.0; requiere infra de Firebase/APNs.
- Email/WhatsApp: desplazado a Etapa 10/post-v1.0.
- Broadcast por rol/grupo sin lista explícita: descartado para evitar entregas accidentales y por la necesidad de auditar quién recibió qué.

**Razón:** El director necesita comunicar instrucciones puntuales a operadores ("hoy ajustar ración del corral 12 a 30 kg"). Construir un canal interno es barato (3 modelos, sin servicios externos) y deja registro de lectura/confirmación para auditoría operativa. Sienta la base para canales externos futuros.

---

## DEC-021 — Separación de espacios `(app)/` desktop y `operador/` mobile
**Fecha:** 2026-05-02
**Estado:** Aprobado e implementado

**Decisión:** El frontend Next.js separa dos árboles bajo `apps/web/src/app/`:
- `(app)/` — espacio de **dirección/escritorio** (DIRECTOR, SUPERUSUARIO). Sidebar colapsable, tablas densas, modales.
- `operador/` — espacio **mobile-first del OPERADOR**. Sin sidebar, header móvil, flujos en pasos grandes, optimizado para uso en campo (guantes, sol, escáner).

El layout raíz redirige al `OPERADOR` automáticamente a `/operador` al iniciar sesión. Las páginas operativas que antes vivían bajo `(app)/` (`tratamientos`, `comederos`, `raciones/surtir`, `animales/nuevo`) se movieron a `operador/`. Donde aplica, hay dos páginas diferentes (ej: `(app)/animales/nuevo/page.tsx` para el director y `operador/animales/nuevo/page.tsx` para el campo).

**Alternativas consideradas:**
- Una sola UI responsive con condicionales por rol: terminó produciendo componentes con muchas ramas y peor performance en mobile.
- Apps Next.js separadas: sobreingeniería para una sola organización; complica auth, deploy y duplica código de UI base.

**Razón:** Los dos públicos tienen necesidades muy distintas (densidad de información vs. interacción de un dedo enguantado). Separar árboles permite tipografía, paddings y patrones de navegación específicos sin pelearse con condicionales. La capa de datos (TanStack Query, API client, Zustand) sigue siendo una sola.

---

## DEC-022 — Asignación automática de corral al registrar animal
**Fecha:** 2026-05-02
**Estado:** Aprobado e implementado

**Decisión:** Al registrar un animal, el usuario solo selecciona el `GrupoCorrales` de destino. La UI auto-asigna silenciosamente el primer corral activo del grupo y envía `corralId` al API. La columna `Animal.corralId` se mantiene `NOT NULL` en DB.

Aplica tanto al flujo de operador (`operador/animales/nuevo`) como al de director (`(app)/animales/nuevo`).

**Alternativas consideradas:**
- Hacer `corralId` opcional y permitir animales "huérfanos": rompe los índices `[corralId, estado]` y los reportes por corral.
- Forzar selección manual: añade fricción y errores en campo; el operador rara vez sabe el corral exacto antes de la descarga física.
- Crear un corral "default" por grupo: complica el modelo y duplica datos.

**Razón:** Refleja la operación real: el corral exacto se asigna al momento de la descarga. La pantalla deja al director reasignar después desde la ficha, lo que ya es el flujo natural. La invariante de DB (`corralId NOT NULL`) preserva trazabilidad y queries históricas sin cambios.
