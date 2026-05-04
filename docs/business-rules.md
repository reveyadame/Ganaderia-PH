# Reglas de Negocio — Ganadería PH

Documento vivo. Toda regla derivada de decisiones del cliente o del dominio queda registrada aquí con su ID, contexto y comportamiento esperado.

**Última actualización:** 2026-05-02 (Etapas 1–8 completadas; en curso Etapa 9 con Notificaciones y Catálogo de Raciones).

---

## Módulo: Animales

### BR-AN-001 — Identificación dual obligatoria
Todo animal debe tener al menos uno de los dos aretes al momento del registro:
- **Arete SINIIGA** (amarillo): identificador legal permanente. Único en toda la organización. No se reutiliza nunca.
- **Arete blanco**: identificador operativo temporal. Escaneable. Reutilizable entre animales.

El sistema permite registrar un animal con solo arete SINIIGA, solo arete blanco, o ambos. Sin embargo, para que el animal esté operativo en flujos de campo (tratamientos, etc.) debe tener al menos un arete escaneable activo.

**Implementación:** validación en `AnimalesService.create()`. Si no se provee ni `areteSiniiga` ni `areteBlancoId`, el frontend rechaza el formulario.

### BR-AN-002 — Unicidad del arete blanco activo
Un código de arete blanco solo puede estar asignado a un animal simultáneamente. La tabla `AsignacionAreteBlanco` tiene siempre como máximo un registro con `fechaLiberacion IS NULL` por código de arete.

**Implementación:** el servicio valida que el arete tenga `estado = DISPONIBLE` antes de asignarlo. Un arete en estado `ASIGNADO` no puede asignarse a otro animal.

### BR-AN-003 — Liberación de arete blanco por administrador
La liberación del arete blanco de un animal egresado o muerto solo puede hacerla un usuario con tipo DIRECTOR o SUPERUSUARIO mediante `PATCH /animales/:id/liberar-arete`. No se libera automáticamente al registrar el egreso del animal.

**Razón:** el director libera el arete cuando lo recupera físicamente, lo que no siempre coincide con el momento del egreso en el sistema.

### BR-AN-004 — Resolución de código escaneado
Al escanear cualquier código en campo, el servicio `ScanService.resolve()` ejecuta esta lógica en orden (código normalizado a UPPERCASE antes de buscar):
1. Buscar en `Animal.areteSiniiga` (solo animales ACTIVOS)
2. Buscar en `AsignacionAreteBlanco` donde `areteBlanco.codigo = input AND fechaLiberacion IS NULL`
3. Si contexto incluye CORRAL: buscar en `Corral.codigo` (solo corrales activos)
4. Si no hay coincidencia: retornar `{ tipo: 'NO_ENCONTRADO' }`

### BR-AN-005 — Registro de sexo obligatorio
El sexo del animal (MACHO o HEMBRA) es obligatorio en el registro de llegada.

### BR-AN-006 — Peso de entrada obligatorio
El peso de entrada en kilogramos es obligatorio. Debe ser un número positivo mayor a cero.

### BR-AN-007 — Estado del animal
Los estados válidos de un animal son:
- `ACTIVO`: en el rancho, operativo
- `EGRESADO`: salió por venta u otro motivo
- `MUERTO`: murió en el rancho
- `BAJA`: retirado por enfermedad, traslado, u otro

Solo un animal en estado `ACTIVO` puede recibir tratamientos o aparecer en lecturas de corral.
El estado al momento del egreso se determina por la causa: `MUERTE` → `MUERTO`; todo lo demás → `EGRESADO`.

### BR-AN-008 — Lote como agrupación opcional
Un lote es un grupo de animales que llegan juntos el mismo día de la misma procedencia. Su uso es opcional. Permite consultar y reportar por grupo de llegada.

### BR-AN-010 — Asignación automática de corral al registrar
El operador y el director **no eligen corral** al dar de alta un animal: solo seleccionan el `GrupoCorrales` de destino. La UI auto-asigna silenciosamente el primer corral activo del grupo y el director puede reasignar después desde la ficha del animal.

**Razón:** en operación real el corral exacto suele decidirse al momento de la descarga física; obligar a elegirlo en pantalla añade fricción y errores. La capacidad legal del registro vive a nivel del grupo, no del corral. La columna `Animal.corralId` permanece `NOT NULL` en DB para preservar trazabilidad y los índices históricos.

### BR-AN-009 — Costo acumulado calculado dinámicamente
El costo acumulado de un animal nunca se almacena como campo en `Animal`. Se calcula siempre como:
```sql
SUM(AplicacionTratamiento.costoTotalCalculado WHERE animalId = :id)
```
Esto garantiza que el dato siempre refleje el historial real sin inconsistencias por actualizaciones parciales.

---

## Módulo: Pool de Aretes Blancos

### BR-AR-001 — Aretes administrados por pool
Los aretes blancos se gestionan en un pool por organización. Solo los usuarios DIRECTOR o SUPERUSUARIO pueden agregar aretes al pool o eliminarlos.

### BR-AR-002 — Alta individual o en lote
Un administrador puede dar de alta aretes individualmente o en lote (múltiples códigos a la vez). El sistema rechaza cualquier código que ya exista en el pool (conflicto).

### BR-AR-003 — Solo se puede eliminar un arete DISPONIBLE
Un arete en estado `ASIGNADO` no puede eliminarse del pool. Debe liberarse primero.

### BR-AR-004 — El endpoint `/aretes/disponibles` es accesible por todos los usuarios autenticados
Cualquier usuario autenticado puede consultar los aretes disponibles para asignar al registrar un animal. Solo requiere token JWT válido, sin restricción de rol o actividad.

---

## Módulo: Farmacia e Inventario

### BR-FA-001 — Una farmacia por GrupoCorrales
Cada GrupoCorrales puede estar asignado a exactamente una farmacia. Una farmacia puede abastecer a múltiples GrupoCorrales. La clave foránea vive en `GrupoCorrales.farmaciaId`.

### BR-FA-002 — Alta de unidad de medicamento (UnidadMedicamento)
Al dar de alta una nueva unidad (frasco/pieza) de un medicamento:
1. Se registra el costo de adquisición de esa unidad (`costoUnitario`)
2. El sistema calcula: `costoPorMedida = costoUnitario / medicamento.volumenPresentacion`
3. Si existen unidades `DISPONIBLE` del mismo medicamento en la misma farmacia → la nueva unidad entra como `PRE_INGRESO`
4. Si no existen unidades `DISPONIBLE` → entra directamente como `DISPONIBLE`

### BR-FA-003 — Promoción PRE_INGRESO → DISPONIBLE
Una unidad en `PRE_INGRESO` pasa a `DISPONIBLE` automáticamente cuando no quedan unidades del mismo medicamento en la misma farmacia con estado `DISPONIBLE` o `SALIDA_TEMPORAL` con `fechaEntrada` anterior.

Esta verificación se ejecuta cada vez que una unidad cambia a `CONSUMIDO` o `BAJA`.

### BR-FA-004 — Ciclo de vida de una unidad física
```
PRE_INGRESO → DISPONIBLE → SALIDA_TEMPORAL → DISPONIBLE (regresa con contenido)
                                           → CONSUMIDO  (regresa vacío)
           → DISPONIBLE → BAJA            (ajuste, pérdida, caducidad, etc.)
```
Los estados `CONSUMIDO` y `BAJA` son terminales. No se pueden revertir.

### BR-FA-005 — Salida temporal requiere médico y autorizador registrados
Toda salida temporal debe registrar:
- Unidades que salen
- Médico/veterinario que las recibe (usuario del sistema)
- Usuario que autoriza (DIRECTOR, SUPERUSUARIO, o actividad FARMACIA)
- Fecha y hora

### BR-FA-006 — Un médico puede tener múltiples unidades simultáneas
No hay límite en el número de `SalidaTemporal` abiertas para el mismo médico.

### BR-FA-007 — Frasco parcialmente usado puede re-salir
Si un frasco regresa de una salida temporal con contenido (no vacío), vuelve a estado `DISPONIBLE` y puede salir nuevamente. La salida temporal se cierra con `estadoRegreso = REGRESO_CON_CONTENIDO`.

### BR-FA-008 — Baja definitiva requiere justificación condicional
La justificación es **obligatoria** para tipos: `AJUSTE`, `PERDIDA`, `ROBO`, `DANO`.
Para `CONSUMO_CAMPO` y `CADUCIDAD`, es recomendada pero no obligatoria.

### BR-FA-009 — Alerta de stock mínimo
Cuando `COUNT(DISPONIBLE + SALIDA_TEMPORAL) <= Medicamento.stockMinimo`, el sistema genera una alerta activa en el dashboard para usuarios con acceso a farmacia de esa ubicación.

### BR-FA-010 — Mismo medicamento, distintos costos en distintas farmacias
Un medicamento del catálogo puede tener unidades en diferentes farmacias, cada una con su propio `costoUnitario` y `costoPorMedida`. El costo es por unidad física, no global.

---

## Módulo: Tratamientos

### BR-TR-001 — Tratamiento sobre animal activo únicamente
Solo se puede registrar un tratamiento sobre un animal con estado `ACTIVO`.

### BR-TR-002 — Costo al momento de aplicación (FIFO, inmutable)
El `costoPorMedidaMomento` se toma de la `UnidadMedicamento` `DISPONIBLE` o `SALIDA_TEMPORAL` con fecha de entrada más antigua (FIFO) de la farmacia del GrupoCorrales del corral del animal. Este valor se almacena en `AplicacionTratamientoItem` y **nunca cambia**.

### BR-TR-003 — Dos tipos de aplicación
- **Por kit (template):** se selecciona un `TratamientoTemplate` predefinido. Se guarda snapshot JSON inmutable.
- **Individual:** se selecciona directamente un medicamento con su dosis.

### BR-TR-004 — Snapshot de kit es inmutable
`AplicacionTratamiento.templateSnapshot` nunca se modifica una vez creado. Cambios posteriores al `TratamientoTemplate` no afectan registros históricos.

### BR-TR-005 — Sin límite de tratamientos por día
Un animal puede recibir múltiples tratamientos el mismo día.

### BR-TR-006 — Los tratamientos NO decrementan stock de farmacia
El registro de un tratamiento no toca el inventario. El stock solo cambia en el módulo de Farmacia (salidas temporales, bajas, regreso de frasco vacío).

### BR-TR-007 — Registro del aplicador obligatorio
Todo tratamiento registra el usuario operador que lo aplicó, fecha y hora.

---

## Módulo: Comederos

### BR-CO-001 — Lectura cualitativa por corral individual
La lectura de comedero se registra a nivel de corral individual (no de GrupoCorrales) y captura un **estado cualitativo configurable**, no cantidades numéricas. Sirve como insumo para que el administrador decida la ración del día siguiente.

### BR-CO-002 — Estados configurables por organización
El catálogo de estados posibles del comedero (ej: "Con comida", "Bien", "Lamido", "Muy lamido") lo define un usuario DIRECTOR o SUPERUSUARIO en `EstadoComederoConfig`. Cada organización tiene su propio catálogo. Solo se pueden registrar lecturas con estados activos del catálogo de la organización.

### BR-CO-003 — Soft delete de estados con historial
Un `EstadoComederoConfig` no se elimina si tiene lecturas asociadas. Se desactiva con `activo = false`. Las lecturas históricas conservan la referencia y se pueden seguir consultando.

### BR-CO-004 — Datos de la lectura
- Corral
- Estado del comedero (FK al catálogo configurable)
- Fecha y hora
- Operador registrador
- Notas (opcional)

### BR-CO-005 — Lectura independiente del surtido
La lectura del estado del comedero y el surtido de la ración son **acciones separadas**. Pueden ser realizadas por usuarios distintos, en momentos distintos, y ninguna depende de la otra para ejecutarse.

---

## Módulo: Raciones

### BR-RA-001 — Una ración activa por corral
Cada corral tiene como máximo una ración activa. Al crear una nueva ración para un corral con ración activa, la anterior se cierra automáticamente con `fechaFin = hoy`.

### BR-RA-002 — Ración definida por turno (mañana / tarde)
La ración diaria se captura en kilogramos divididos en dos turnos: `cantidadKgManana` y `cantidadKgTarde`. Por defecto la UI sugiere 50/50 del total, pero el administrador puede ajustar cada cantidad de forma independiente.

### BR-RA-003 — Captura manual por administración
Las cantidades por turno las define un usuario DIRECTOR, SUPERUSUARIO, o con actividad RACIONES. Es siempre **manual y por criterio del director** — no hay cálculo automático. La toma de decisiones se basa en el dashboard de comederos (BR-DA-*) y el historial de lecturas.

### BR-RA-004 — Surtido por turno
Cada `SurtidoRacion` registra explícitamente el `turno` (`MANANA` | `TARDE`), la cantidad definida del turno (`cantidadKgManana` o `cantidadKgTarde`) como `cantidadDefinida`, y la cantidad real surtida. Un corral puede recibir 1 o 2 surtidos por día (típicamente 2).

### BR-RA-005 — Diferencia siempre registrada
```
diferencia = cantidadSurtida - cantidadDefinida
// positivo = surtió de más; negativo = surtió de menos
```

### BR-RA-006 — El operador ve el turno y la cantidad al escanear
Al escanear un corral en el módulo de surtido, el endpoint `/scan/resolve` retorna la ración activa con ambos turnos. El frontend sugiere el turno por defecto según hora del día (MANANA antes de las 14:00, TARDE después), pero el operador puede cambiarlo manualmente.

### BR-RA-007 — Catálogo de raciones por organización
Las raciones se nombran a partir de un catálogo (`RacionCatalogo`) gestionado por DIRECTOR o SUPERUSUARIO. Al definir una ración para un corral se selecciona una entrada del catálogo y el campo `nombre` de la `RacionDefinicion` se copia desde ahí. La definición conserva además un `catalogoId` opcional como referencia trazable.

Las raciones del catálogo se desactivan con `activo = false` (soft delete). Las definiciones históricas mantienen su nombre copiado y siguen siendo válidas aunque la entrada del catálogo se desactive.

### BR-RA-008 — Catálogo separado de cantidades
El `RacionCatalogo` solo guarda nombre y descripción genérica. Las cantidades por turno (`cantidadKgManana`, `cantidadKgTarde`) se definen siempre **por corral en `RacionDefinicion`**, no en el catálogo. Esto permite reutilizar una receta ("Engorda fase 2") con cantidades distintas en distintos corrales según consumo observado.

---

## Módulo: Usuarios y Acceso

### BR-US-001 — Tipos de usuario y capacidades

| Tipo | Descripción |
|---|---|
| `SUPERUSUARIO` | Acceso total sin restricciones, en cualquier organización |
| `DIRECTOR` | Gestión completa dentro de sus GrupoCorrales asignados + dashboard consolidado y reportes |
| `OPERADOR` | Acceso restringido por actividades y GrupoCorrales asignados |

> **Nota histórica:** El sistema previo distinguía `ADMIN` (gestión por grupos) y `DIRECTOR` (solo lectura). En la migración `20260501070000_consolidate_director_role` ambos roles se consolidaron en `DIRECTOR`, que ahora cubre las dos capacidades. Cualquier usuario `ADMIN` se migró a `DIRECTOR`. Ver DEC-018.

### BR-US-002 — Acceso efectivo del OPERADOR
El acceso se determina por la intersección de actividades asignadas × GrupoCorrales asignados. Ejemplo: actividad `TRATAMIENTOS` + grupo "Corrales Matriz" → puede registrar tratamientos solo en animales de corrales de "Corrales Matriz".

### BR-US-003 — Actividades disponibles para OPERADOR
- `REGISTRO` — alta de animales, egreso
- `TRATAMIENTOS` — aplicar tratamientos
- `COMEDEROS` — lecturas de comedero
- `RACIONES` — surtido de ración
- `FARMACIA` — operaciones de farmacia (salidas, bajas, altas de unidades)
- `REPORTES` — acceso a reportes sin operación

### BR-US-004 — SUPERUSUARIO y DIRECTOR bypasan actividades
La tabla `UsuarioActividad` solo aplica al tipo `OPERADOR`. El `ActividadGuard` está configurado con `ROLES_SIN_RESTRICCION = [SUPERUSUARIO, DIRECTOR]`.

### BR-US-005 — Soft deletes para usuarios
Los usuarios no se eliminan. Se desactivan con `activo = false`. Un usuario inactivo no puede iniciar sesión.

---

## Módulo: Dashboard y Reportes

### BR-DA-001 — Acceso al dashboard
- SUPERUSUARIO: dashboard consolidado de toda la organización
- DIRECTOR: dashboard de sus GrupoCorrales asignados (o consolidado si los tiene todos)
- OPERADOR con actividad REPORTES: dashboard de sus GrupoCorrales

### BR-DA-002 — KPIs mínimos del dashboard (Etapa 8)
- Total de animales activos por GrupoCorrales y total consolidado
- Costo promedio acumulado por animal
- Stock crítico (medicamentos bajo `stockMinimo`)
- Tratamientos aplicados en los últimos 7 días
- Lecturas de comedero pendientes del día
- Animales sin tratamiento en los últimos N días (configurable)

### BR-DA-003 — Reportes a tres niveles de granularidad
- Por animal individual
- Por corral
- Por GrupoCorrales

---

## Módulo: Notificaciones

### BR-NO-001 — Solo DIRECTOR y SUPERUSUARIO emiten
La creación de una `Notificacion` está restringida a usuarios `DIRECTOR` o `SUPERUSUARIO`. El operador es siempre destinatario, nunca emisor.

### BR-NO-002 — Destinatarios explícitos por usuario
Cada notificación lista de forma explícita sus `destinatariosIds` (tabla `NotificacionDestinatario`). No existen "broadcasts" implícitos por rol o grupo: si un director quiere notificar a "todos los operadores de Corrales Matriz", el cliente expande la lista al crear la notificación.

### BR-NO-003 — Prioridad y comportamiento del cliente
Los valores de `PrioridadNotificacion` son `INFO`, `AVISO`, `CRITICA`. La prioridad influye en la presentación visual del cliente (color, persistencia del banner móvil) pero no cambia el comportamiento de entrega — todas se persisten igual.

### BR-NO-004 — Lectura y confirmación
La tabla `NotificacionLectura` registra dos eventos por destinatario:
- `leidaEn` — momento en que el usuario abre la notificación
- `confirmadaEn` — opcional, confirmación explícita ("entendido")

Una notificación crítica puede exigir confirmación además de lectura (validado en cliente).

### BR-NO-005 — Expiración opcional
`Notificacion.expiraEn` es opcional. Si está presente y la fecha pasó, el cliente la oculta de la lista activa pero el registro queda en histórico.
