# Sistema de Diseño UI — Ganadería PH

Guía de referencia visual y de componentes. Todo el frontend debe seguir estas especificaciones para garantizar consistencia total.

**Referencia estética:** Linear, Vercel Dashboard, Stripe.
**Filosofía:** SaaS empresarial moderno. Light mode como default. Limpio, denso en información sin ser abrumador.
**Dos espacios diferenciados:** desde Etapa 9 hay dos árboles de UI con tratamiento distinto:
- **`(app)/`** — escritorio/dirección: sidebar colapsable, tablas densas, modales, foco en datos consolidados.
- **`operador/`** — mobile-first del operador: sin sidebar, header móvil, flujos en pasos grandes, controles aptos para guantes/sol/escáner.

**Estado:** Sistema de tokens HSL implementado. Componentes UI base completos. Sidebar colapsable y responsivo en `(app)/`. Operador con header propio y `MobilePageHeader`. Tipografía Plus Jakarta Sans.

---

## Tokens de Diseño

### Paleta de colores (HSL variables)

```css
:root {
  /* Superficies */
  --background:        0 0% 99%;
  --foreground:        222 13% 11%;
  --surface:           0 0% 100%;
  --surface-raised:    0 0% 100%;
  --surface-sunken:    220 14% 97%;

  /* Bordes */
  --border:            220 13% 91%;
  --border-strong:     220 12% 84%;

  /* Muted (hover, UI sutil) */
  --muted:             220 14% 96%;
  --muted-foreground:  220 9% 38%;

  /* Brand — charcoal neutro (agnóstico a industria) */
  --brand:             222 20% 14%;
  --brand-hover:       222 18% 22%;
  --brand-subtle:      220 14% 96%;
  --brand-foreground:  0 0% 100%;

  /* Accent — índigo para estados activos y highlights */
  --accent:            237 79% 58%;
  --accent-subtle:     237 86% 95%;
  --accent-foreground: 237 79% 42%;

  /* Semánticos */
  --success:           142 71% 36%;
  --success-subtle:    142 76% 96%;
  --success-foreground:142 71% 28%;

  --warning:           32 95% 44%;
  --warning-subtle:    48 96% 95%;
  --warning-foreground:26 84% 32%;

  --danger:            0 72% 51%;
  --danger-subtle:     0 86% 97%;
  --danger-foreground: 0 70% 40%;

  --info:              217 91% 50%;
  --info-subtle:       214 100% 97%;
  --info-foreground:   224 76% 38%;
}

.dark {
  --background:        222 20% 7%;
  --foreground:        220 14% 96%;
  --surface:           222 18% 10%;
  --surface-raised:    222 16% 13%;
  --surface-sunken:    222 22% 5%;

  --border:            220 14% 18%;
  --border-strong:     220 12% 26%;

  --muted:             220 14% 14%;
  --muted-foreground:  220 9% 64%;

  --brand:             0 0% 98%;
  --brand-subtle:      220 14% 14%;
  --brand-foreground:  222 20% 10%;

  --accent:            237 79% 70%;
  --accent-subtle:     237 50% 18%;
  --accent-foreground: 237 79% 84%;

  /* (semánticos con mayor luminosidad en dark) */
}
```

Todos los tokens están configurados en `tailwind.config.ts` como colores semánticos con prefijos:
`brand`, `surface`, `border`, `muted`, `accent`, `success`, `warning`, `danger`, `info`.

### Tipografía

```
Fuente principal:  Plus Jakarta Sans (400/500/600/700)
Fuente mono:       JetBrains Mono (códigos de arete, IDs)

Variable CSS: --font-geist-sans (mantiene compatibilidad con clases Tailwind)
```

**Escala tipográfica usada en la app:**
```
text-[10.5px]  — labels de sección en sidebar, badges
text-[11px]    — metadata, timestamps, ayuda
text-[12px]    — texto secundario, subtexto
text-[13px]    — body principal, nav items, descripciones
text-[14px]    — encabezados de tarjeta
text-[26px]    — valores KPI (tabular-nums, font-bold)
```

### Radios y sombras

```
Radios:   sm=6px, md=8px, lg=10px, xl=14px, 2xl=20px
Sombras:  xs, sm, md, lg, xl, focus (0 0 0 3px accent/12%)
```

### Animaciones

```
fade-in, slide-up, slide-down, scale-in  — 150–240ms cubic-bezier(0.16,1,0.3,1)
shimmer                                  — skeleton loading 2s linear infinite
```

---

## Layout Principal

### Espacio `(app)/` — escritorio del director



```
Desktop (sidebar expandido, 248px):
┌────────────────────────────────────────────────────────┐
│ Sidebar 248px │ Main content (flex-1, bg-surface-sunken)│
│ ┌───────────┐ │ ┌──────────────────────────────────────┐│
│ │ [G] Logo  │ │ │ PageHeader: título + filtros + badge  ││
│ │     [⊣]   │ │ ├──────────────────────────────────────┤│
│ ├───────────┤ │ │                                      ││
│ │ OPERACIÓN │ │ │ Contenido de la página               ││
│ │ ● Dashboard│ │ │ (max-w-7xl, px-6 lg:px-10, py-8)    ││
│ │  Animales  │ │ │                                      ││
│ │  ...       │ │ └──────────────────────────────────────┘│
│ ├───────────┤ │                                          │
│ │ [JD] Juan │ │                                          │
│ │     [⎋]   │ │                                          │
│ └───────────┘ │                                          │
└────────────────────────────────────────────────────────┘

Desktop (sidebar colapsado, 64px):
┌──────────────────────────────────────────────────────────┐
│  64px  │ Main content (flex-1)                           │
│ [G]    │                                                 │
│ [⊢]    │                                                 │
│ ─────  │                                                 │
│ [●]    │  (solo iconos, con tooltip al hover)            │
│ [🐾]   │                                                 │
│ ...    │                                                 │
└──────────────────────────────────────────────────────────┘

Mobile (< 768px):
┌────────────────────────────────┐
│ [☰] Ganadería PH               │  ← topbar sticky
├────────────────────────────────┤
│ Contenido de la página         │
│ (px-4, py-6, max-w-7xl)        │
└────────────────────────────────┘
  ↓ al presionar [☰]
┌──────────────┬─────────────────┐
│ Sidebar      │ Overlay oscuro  │
│ (drawer 248px│ (click cierra)  │
│  slide-in)   │                 │
└──────────────┴─────────────────┘
```

### Sidebar — comportamiento (`(app)/` solamente)

| Estado | Ancho | Contenido |
|--------|-------|-----------|
| Expandido (default) | 248px | Logo + nombre + botón colapsar + grupos de nav con labels + user card completo |
| Colapsado | 64px | Logo + botón expandir + solo iconos (con `title` para tooltip nativo) + initials + logout |
| Mobile drawer | 248px | Igual a expandido + botón X para cerrar |

El estado `collapsed` se persiste en `localStorage` bajo la clave `sidebar-collapsed`.

**Active state:** `bg-accent-subtle text-accent-foreground` + barra izquierda `bg-accent`. Los iconos activos usan `text-accent`.

### Espacio `operador/` — UI mobile-first del operador

Layout independiente en `apps/web/src/app/operador/layout.tsx`. Sin sidebar. Header móvil en cada página vía `MobilePageHeader` (`components/operador/`).

```
Mobile (≤ 768px, target principal):
┌─────────────────────────────────┐
│ ← Título                        │  ← MobilePageHeader (back + title + action)
│   Subtítulo opcional            │
├─────────────────────────────────┤
│                                 │
│  Contenido en una sola columna  │
│  (px-4, py-5, space-y-5)        │
│                                 │
│  Botones grandes (size="xl",    │
│  alto ≥ 56px) para uso con      │
│  guantes y bajo el sol.         │
│                                 │
└─────────────────────────────────┘

Desktop (>= 768px):
La UI del operador no se diseña para escritorio. Si un director entra desde un dispositivo móvil al espacio `(app)/`, ve un banner (`MobileOperatorBanner`) ofreciendo cambiar al espacio operador o seguir en escritorio.
```

#### Convenciones del espacio operador

- **Tipografía y tamaños:** body 14–15px, títulos 18–20px. Aumentar de 13/14 que se usa en `(app)/`.
- **Botones:** alto mínimo 48px (`size="lg"`), preferir `size="xl"` (≥56px) en CTAs primarios de pasos.
- **Inputs:** mismo `Input`/`Select` base, pero envueltos en cards `rounded-2xl` con padding generoso.
- **Pasos guiados:** flujos como alta de animal o aplicación de tratamiento se dividen en `step` con un solo objetivo por pantalla; nada de formularios largos.
- **Color accent (índigo):** se mantiene para estados activos (cards seleccionables con borde `border-brand`/`bg-brand/5`).
- **Sin tablas:** listados se muestran como cards apilables, no como tablas.

#### Componentes específicos del operador (`components/operador/`)

- `MobilePageHeader` — header consistente con back, título, subtítulo opcional y slot de acción.
- (otros que se vayan agregando viven en este folder)

---

## Componentes UI Base

Todos en `apps/web/src/components/ui/`.

### Badge
```typescript
variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'outline'
dot?: boolean   // indicador de punto de color
```
Casos de uso por variante:
- `success` → Activo, en orden, stock OK
- `warning` → Stock bajo mínimo, pendiente
- `danger` → Error, baja, muerto
- `info` → Conteos, datos neutros (ej: "3 corrales")
- `muted` → Tags secundarios
- `outline` → Sin relleno

### Button
```typescript
variant: 'default' | 'outline' | 'ghost' | 'danger'
size: 'sm' | 'md' | 'lg'
loading?: boolean  // spinner + disabled automático
```

### KPI Card (Dashboard)
Cada KPI tiene un chip de icono con color semántico:

| KPI | Color chip | Icono |
|-----|-----------|-------|
| Animales activos | `info` (azul) | PawPrint |
| Costo / animal | `success` (verde) | DollarSign |
| Costo total | `success` (verde) | DollarSign |
| Stock crítico | `warning` (ámbar) / `default` si OK | Package |
| Tratamientos hoy | `accent` (índigo) | Syringe |
| Últimos 7 días | `accent` (índigo) | Syringe |

Colores de chip definidos en `kpiIconStyles`:
```typescript
const kpiIconStyles: Record<KpiColor, string> = {
  blue:    'bg-info-subtle text-info-foreground border-info/20',
  green:   'bg-success-subtle text-success-foreground border-success/20',
  amber:   'bg-warning-subtle text-warning-foreground border-warning/20',
  purple:  'bg-accent-subtle text-accent-foreground border-accent/20',
  default: 'bg-muted text-foreground/60 border-border',
}
```

### PageHeader
```typescript
title: string
description?: string
action?: ReactNode    // botón o select en la esquina derecha
meta?: ReactNode      // badge debajo del título
```

### Skeleton / TableSkeleton
Usa animación `shimmer` (gradiente 200% corriendo). Nunca spinner bloqueante en listas.

### Toast
Sistema global con `toast('success' | 'error', message)`. Se monta en `<ToastProvider />` en el root layout.

---

## Componentes de Escaneo (`components/scanner/`)

### BarcodeInput
Input unificado para escaneo. Modos:
1. **Teclado** — escáneres Bluetooth/USB que simulan teclado (Enter dispara `onScan`)
2. **Cámara** — botón abre `CameraScanner` en overlay

### CameraScanner
Overlay pantalla completa. Import dinámico de `html5-qrcode` dentro de `useEffect` (SSR-safe). Cámara trasera, animación `scanLine`, vibración háptica (`navigator.vibrate(80)`), manejo de permisos denegados.

### ScanResultAnimalCard
Tarjeta de resultado: arete SINIIGA (badge), arete blanco activo, sexo, ubicación (corral + grupo), peso entrada, fecha entrada, costo acumulado.

---

## Responsive Breakpoints

```
mobile:   < 768px    → sidebar como drawer, topbar con hamburger, grid 1 col
tablet:   768-1024px → sidebar visible, grids 2 cols
desktop:  > 1024px   → sidebar fijo o colapsado, grids 3 cols, px-10
```

Grids del dashboard:
```
KPI cards:     grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
Resumen grupos: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
Quick links:   grid-cols-1 sm:grid-cols-3
```

---

## Patrones de UX

### Estados de carga
```
Lista / Tabla  → TableSkeleton (nunca spinner bloqueante)
KPI card       → Skeleton h-8 w-28
Formulario     → Button loading + disabled
Scanner        → Overlay animado, no bloquea cámara
```

### Errores
```
Red / 5xx      → Toast 'error' no intrusivo
401            → clearAuth() + redirect /login automático (API client interceptor)
404            → Página dedicada con contexto
403            → Mensaje "Sin permiso" (nunca 404)
Validación     → Inline, campo a campo
```

### Formularios
- Labels siempre arriba del input (nunca flotantes)
- Mensajes de error en línea con ícono
- Botón primario: loading automático en async operations
- Confirm dialog para acciones destructivas

---

## Librería de Iconos

Lucide React exclusivamente. Tamaño estándar: `h-4 w-4` (16px). En nav: `h-[15px] w-[15px]`. En chips KPI: `h-5 w-5`.

```
Animales:       PawPrint, Tag, Scale, Calendar
Farmacia:       Package, FlaskConical, ArrowUpFromLine
Tratamientos:   Syringe, ClipboardList, History
Comederos:      UtensilsCrossed, BarChart3
Raciones:       Scale, Truck
Usuarios:       Users, UserCog
Corrales:       MapPin, Building2
Escáner:        ScanLine, Camera, X
Dashboard:      LayoutDashboard, TrendingUp, DollarSign, AlertTriangle
Notificaciones: Bell, BellRing, AlertOctagon (CRITICA)
Nav:            PanelLeftClose, PanelLeftOpen, Menu, LogOut, ChevronRight, Check
```

---

## Notificaciones (UI)

Las `Notificacion` (DEC-020) tienen tres prioridades con tratamiento visual diferenciado:

| Prioridad | Color | Componente sugerido | Comportamiento |
|---|---|---|---|
| `INFO` | `info` (azul) | Toast suave + entrada en lista | Auto-cierre, sin confirmación |
| `AVISO` | `warning` (ámbar) | Banner persistente hasta `leidaEn` | Requiere abrir/leer |
| `CRITICA` | `danger` (rojo) | Modal bloqueante + banner persistente | Requiere `confirmadaEn` explícito |

En el espacio `operador/`, las notificaciones críticas se muestran como modal bloqueante apenas el operador entra a la app, hasta que confirma. En `(app)/`, el director ve un panel de bell-icon con contador no leídas en el header.
