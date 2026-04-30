# Sistema de Diseño UI — Ganadería PH

Guía de referencia visual y de componentes. Todo el frontend debe seguir estas especificaciones para garantizar consistencia total.

**Referencia estética:** Linear, Vercel Dashboard, Stripe, Clerk.
**Filosofía:** SaaS empresarial moderno. Limpio, denso en información sin ser abrumador, preparado para uso en campo (móvil) y en oficina (desktop).
**Estado:** Tokens definidos. Componentes UI base implementados. Componentes de escaneo implementados.

---

## Tokens de Diseño

### Paleta de colores

```css
:root {
  /* Base — dark mode first (primario en campo) */
  --background:        #0a0a0a;
  --background-subtle: #111111;
  --surface:           #161616;
  --surface-raised:    #1c1c1c;
  --border:            #2a2a2a;
  --border-strong:     #383838;

  /* Texto */
  --text-primary:      #ededed;
  --text-secondary:    #a1a1a1;
  --text-tertiary:     #6b6b6b;
  --text-disabled:     #444444;

  /* Brand */
  --brand:             #16a34a;   /* verde — agro, salud, positivo */
  --brand-hover:       #15803d;
  --brand-subtle:      #052e16;
  --brand-foreground:  #ffffff;

  /* Semánticos */
  --success:           #22c55e;
  --success-subtle:    #052e16;
  --warning:           #f59e0b;
  --warning-subtle:    #1c1400;
  --danger:            #ef4444;
  --danger-subtle:     #1f0000;
  --info:              #3b82f6;
  --info-subtle:       #0c1a3a;

  /* Estados de inventario */
  --estado-disponible:      #22c55e;
  --estado-pre-ingreso:     #f59e0b;
  --estado-salida-temporal: #3b82f6;
  --estado-consumido:       #6b6b6b;
  --estado-baja:            #ef4444;
}

/* Light mode (oficina/desktop) */
[data-theme="light"] {
  --background:        #ffffff;
  --background-subtle: #fafafa;
  --surface:           #f5f5f5;
  --surface-raised:    #ffffff;
  --border:            #e5e5e5;
  --border-strong:     #d4d4d4;

  --text-primary:      #0a0a0a;
  --text-secondary:    #525252;
  --text-tertiary:     #a3a3a3;

  --brand-subtle:      #f0fdf4;
}
```

### Tipografía

```css
/* Display / Headlines */
font-family: 'Geist', 'Inter', system-ui, sans-serif;

/* Monospace (códigos de arete, IDs) */
font-family: 'Geist Mono', 'JetBrains Mono', monospace;

/* Escala tipográfica */
--text-xs:   0.75rem;   /* 12px — labels, badges */
--text-sm:   0.875rem;  /* 14px — body secundario, tabla */
--text-base: 1rem;      /* 16px — body principal */
--text-lg:   1.125rem;  /* 18px — subtítulos */
--text-xl:   1.25rem;   /* 20px — títulos de sección */
--text-2xl:  1.5rem;    /* 24px — títulos de página */
--text-3xl:  1.875rem;  /* 30px — KPIs grandes */
```

### Espaciado

```css
/* Sistema de 4px */
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;    /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
```

### Radios y sombras

```css
--radius-sm:  4px;
--radius-md:  8px;
--radius-lg:  12px;
--radius-xl:  16px;
--radius-full: 9999px;

--shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
--shadow-md:  0 4px 6px rgba(0,0,0,0.4);
--shadow-lg:  0 10px 15px rgba(0,0,0,0.5);
```

---

## Layout Principal

### Shell de la aplicación

```
┌──────────────────────────────────────────────┐
│ Sidebar (240px fijo desktop / drawer mobile) │
│ ┌──────────────────────────────────────────┐ │
│ │ Logo + nombre organización               │ │
│ ├──────────────────────────────────────────┤ │
│ │ Nav items (agrupados por contexto)       │ │
│ │                                          │ │
│ │ OPERACIÓN                                │ │
│ │  • Dashboard                             │ │
│ │  • Animales                              │ │
│ │  • Tratamientos                          │ │
│ │  • Comederos                             │ │
│ │  • Raciones                              │ │
│ │                                          │ │
│ │ FARMACIA                                 │ │
│ │  • Medicamentos                          │ │
│ │  • Inventario                            │ │
│ │  • Salidas                               │ │
│ │                                          │ │
│ │ ADMINISTRACIÓN                           │ │
│ │  • Corrales                              │ │
│ │  • Usuarios                              │ │
│ │  • Configuración                         │ │
│ ├──────────────────────────────────────────┤ │
│ │ Alertas de stock (badge rojo si hay)     │ │
│ │ Avatar + nombre usuario                  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ Main content area                            │
│ ┌──────────────────────────────────────────┐ │
│ │ Page header: título + acciones primarias │ │
│ ├──────────────────────────────────────────┤ │
│ │                                          │ │
│ │ Contenido de la página                   │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Sidebar — solo muestra las secciones a las que el usuario tiene acceso.

---

## Componentes Core

### Scanner Widget
El componente más crítico del sistema. Usado en registro, tratamientos, comederos y raciones.

**Comportamiento:**
- Ocupa el ancho completo en móvil
- Área de cámara con overlay de targeting (crosshair animado)
- Input manual alternativo para código (para cuando la cámara falla)
- Estado visual: `idle | scanning | found | error`
- Al encontrar: vibración háptica (si disponible) + sonido + flash verde
- Al fallar: flash rojo + mensaje de error

**Variantes:**
- `ScannerAnimal` — resuelve a ficha del animal con preview rápido
- `ScannerCorral` — resuelve a datos del corral con ración activa

### Ficha de Animal (Card)
```
┌─────────────────────────────────────────────┐
│ 🟡 #ES001234567890  🔵 Blanco: A-042        │
│ MACHO  •  Entrada: 15 mar 2026  •  ACTIVO   │
│                                             │
│ Peso entrada: 245 kg                        │
│ Corral: 12  |  Corrales Matriz              │
│                                             │
│ Costo acumulado: $1,240.50                  │
│ Tratamientos: 3                             │
└─────────────────────────────────────────────┘
```

### Tabla de datos
- Usa TanStack Table
- Columnas ordenables, filtrables
- Paginación del lado servidor
- Skeleton loading (nunca spinner bloqueante)
- Acción primaria: hover revela botón de acción rápida
- Selección múltiple con checkbox cuando aplica

### Badges de estado

```
EstadoAnimal:
  ACTIVO          → verde sólido
  EGRESADO        → gris
  MUERTO          → rojo tenue
  BAJA            → naranja tenue

EstadoUnidadMedicamento:
  PRE_INGRESO     → amarillo
  DISPONIBLE      → verde
  SALIDA_TEMPORAL → azul
  CONSUMIDO       → gris
  BAJA            → rojo

TipoUsuario:
  SUPERUSUARIO    → púrpura
  ADMIN           → azul
  DIRECTOR        → verde tenue
  OPERADOR        → gris
```

### Formularios
- Labels siempre arriba del input (no flotantes)
- Mensajes de error en línea, en rojo, con ícono
- Botón primario: brand (verde) con estado loading
- Botón secundario: outline
- Botón destructivo: rojo
- Todos los selects y dropdowns usan el componente de shadcn/ui con búsqueda integrada cuando hay >6 opciones

### KPI Cards (Dashboard)
```
┌─────────────────────────────┐
│  Animales Activos           │
│                             │
│  1,247          ↑ 23 hoy    │
│                             │
│  ████████████░░  87%        │
│  de capacidad               │
└─────────────────────────────┘
```

---

## Patrones de UX por Contexto

### UX de Campo (operadores en corrales)

Principios:
- **Taps mínimos:** registro de tratamiento = escanear + confirmar (2 interacciones máximo)
- **Texto grande:** mínimo 16px en elementos interactivos, preferible 18-20px
- **Botones grandes:** mínimo 48px de altura para facilitar el toque con guantes
- **Feedback inmediato:** cada acción responde visualmente en <100ms
- **Sin modales complejos:** acciones de campo usan pantalla completa o bottom sheet, no modales centrados
- **Modo oscuro por defecto:** mejor legibilidad bajo sol directo

### UX de Oficina (admins, directores)

Principios:
- **Densidad de información:** tablas compactas, múltiples secciones en pantalla
- **Acciones contextuales:** menús de contexto en filas de tabla
- **Filtros persistentes:** el estado de filtros se guarda en URL params
- **Shortcuts de teclado:** para operaciones frecuentes (ej: Cmd+K para búsqueda global)

### Estados de carga

```
Lista/Tabla     → Skeleton rows (nunca spinner)
Formulario      → Botón con spinner + disabled
Datos en card   → Skeleton de forma similar a la card
Scanner         → Overlay animado, no bloquea la cámara
```

### Errores

```
Error de red    → Toast no intrusivo + botón "Reintentar"
Error 404       → Página dedicada con contexto útil
Error 403       → Mensaje claro de "Sin permiso" (no 404)
Error 500       → Página de error con ID de referencia
Validación      → Inline, campo a campo, en tiempo real
```

---

## Componente de Escaneo — Flujo de Tratamiento

Este es el flujo más crítico del sistema. Debe ser impecable.

```
Pantalla "Aplicar Tratamiento"

1. Estado inicial
   ┌──────────────────────────────┐
   │  [Área de cámara activa]     │
   │         [ + ]                │
   │  O escribe el código:        │
   │  [________________] [Buscar] │
   └──────────────────────────────┘

2. Animal encontrado (flash verde)
   ┌──────────────────────────────┐
   │ ✓ Animal identificado        │
   │ #ES001234  •  Blanco: A-042  │
   │ MACHO  •  Corral 12          │
   │ Costo actual: $840.00        │
   ├──────────────────────────────┤
   │ Tipo de tratamiento:         │
   │ ○ Kit predefinido            │
   │ ○ Medicamento individual     │
   ├──────────────────────────────┤
   │ [Kit Inicial ▾]              │
   │   • Penicilina 10ml          │
   │   • Ambroxol 20ml            │
   │   • Analgesico 5ml           │
   │ Costo estimado: $85.50       │
   ├──────────────────────────────┤
   │ [  Cancelar  ] [ ✓ Aplicar ] │
   └──────────────────────────────┘

3. Confirmación (500ms de feedback)
   ┌──────────────────────────────┐
   │  ✓ Tratamiento registrado    │
   │  #ES001234  •  Kit Inicial   │
   │  Costo: $85.50               │
   │                              │
   │  [Nuevo escaneo]             │
   └──────────────────────────────┘
```

---

## Animaciones y Micro-interacciones

- **Transiciones de página:** fade + slide sutil (150ms)
- **Apertura de modales/sheets:** slide desde abajo en móvil (200ms)
- **Feedback de escáner:** border pulse verde/rojo según resultado
- **Loading de datos:** skeleton fade-in sincronizado
- **Success de formulario:** checkmark animado + confetti sutil solo en acciones importantes (alta de animal)
- **Hover en tabla:** fila se eleva ligeramente con sombra

Todas las animaciones respetan `prefers-reduced-motion`.

---

## Responsive Breakpoints

```
mobile:   < 768px   → Single column, nav en bottom sheet
tablet:   768-1024px → Sidebar colapsable, 2 columnas
desktop:  > 1024px  → Sidebar fijo, layout completo
```

### Pantallas de campo (mobile-first crítico)
- Registro de animal
- Aplicar tratamiento
- Lectura de comedero
- Surtido de ración

Estas pantallas se diseñan **primero para móvil** y luego se adaptan para desktop.

### Pantallas de oficina (desktop-first)
- Dashboard
- Gestión de farmacia
- Gestión de usuarios y corrales
- Reportes

---

## Componentes de Escaneo Implementados

### BarcodeInput (`components/scanner/barcode-input.tsx`)
Componente principal de captura de códigos. Se usa en todos los módulos de campo.

**Props:**
```typescript
onScan: (codigo: string) => void   // callback al capturar un código
loading?: boolean                  // estado de carga (deshabilita input)
label?: string                     // etiqueta sobre el input
resetAfterScan?: boolean           // limpia el input después de escanear
showCamera?: boolean               // muestra botón de cámara (default: true)
```

**Modos de captura:**
1. **Teclado** — escáneres Bluetooth/USB que simulan teclado. El operador apunta el lector al arete; el código llega como input rápido seguido de Enter.
2. **Cámara** — botón `Camera` abre `CameraScanner` en overlay pantalla completa.

### CameraScanner (`components/scanner/camera-scanner.tsx`)
Overlay de pantalla completa para escaneo por cámara.

- Import dinámico de `html5-qrcode` dentro de `useEffect` (SSR-safe)
- Usa cámara trasera (`facingMode: 'environment'`)
- `qrbox: { width: 300, height: 100 }` — rectángulo estrecho ideal para barcodes 1D (Code 128)
- Animación CSS `scanLine` sobre el encuadre visual
- Vibración háptica (`navigator.vibrate(80)`) al detectar código exitosamente
- Manejo explícito de error de permiso denegado con mensaje claro
- Cleanup en unmount: `scanner.stop()`

### ScanResultAnimalCard (`components/scanner/scan-result-animal.tsx`)
Tarjeta de resultado reutilizable cuando un escaneo resuelve a un animal.

Muestra: arete SINIIGA (badge ámbar), arete blanco activo, badge de sexo, ubicación (corral + grupo), peso de entrada, fecha de entrada, costo acumulado.

---

## Librería de Iconos

Usando **Lucide React** exclusivamente. Íconos consistentes por módulo:

```
Animales:       PawPrint, Tag, Scale, Calendar
Farmacia:       Package, FlaskConical, ArrowUpFromLine, ArrowDownToLine
Tratamientos:   Syringe, ClipboardList, History, CheckCircle
Comederos:      UtensilsCrossed, BarChart3
Raciones:       Scale, Truck
Usuarios:       Users, UserCog, ShieldCheck
Corrales:       MapPin, Building2, ChevronRight
Escáner:        ScanLine, Camera, X
Alertas:        AlertTriangle, Bell
Dashboard:      LayoutDashboard, TrendingUp, DollarSign
Aretes:         Tag (amarillo = SINIIGA, neutro = blanco)
```
