
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganizacionScalarFieldEnum = {
  id: 'id',
  nombre: 'nombre',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FarmaciaScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  descripcion: 'descripcion',
  activa: 'activa',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GrupoCorralesScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  farmaciaId: 'farmaciaId',
  nombre: 'nombre',
  descripcion: 'descripcion',
  activo: 'activo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CorralScalarFieldEnum = {
  id: 'id',
  grupoCorralesId: 'grupoCorralesId',
  codigo: 'codigo',
  nombre: 'nombre',
  capacidad: 'capacidad',
  activo: 'activo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LoteScalarFieldEnum = {
  id: 'id',
  corralId: 'corralId',
  codigo: 'codigo',
  procedencia: 'procedencia',
  fechaEntrada: 'fechaEntrada',
  numAnimalesEsperados: 'numAnimalesEsperados',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.AnimalScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  corralId: 'corralId',
  loteId: 'loteId',
  areteSiniiga: 'areteSiniiga',
  sexo: 'sexo',
  pesoEntrada: 'pesoEntrada',
  fechaEntrada: 'fechaEntrada',
  estado: 'estado',
  fechaEgreso: 'fechaEgreso',
  causaEgreso: 'causaEgreso',
  precioVenta: 'precioVenta',
  notas: 'notas',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AreteBlancoScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  codigo: 'codigo',
  estado: 'estado',
  createdAt: 'createdAt'
};

exports.Prisma.AsignacionAreteBlancoScalarFieldEnum = {
  id: 'id',
  areteBlancoId: 'areteBlancoId',
  animalId: 'animalId',
  asignadoPorId: 'asignadoPorId',
  fechaAsignacion: 'fechaAsignacion',
  liberadoPorId: 'liberadoPorId',
  fechaLiberacion: 'fechaLiberacion'
};

exports.Prisma.MedicamentoScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  nombreGenerico: 'nombreGenerico',
  presentacion: 'presentacion',
  volumenPresentacion: 'volumenPresentacion',
  unidadMedida: 'unidadMedida',
  stockMinimo: 'stockMinimo',
  activo: 'activo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnidadMedicamentoScalarFieldEnum = {
  id: 'id',
  medicamentoId: 'medicamentoId',
  farmaciaId: 'farmaciaId',
  costoUnitario: 'costoUnitario',
  costoPorMedida: 'costoPorMedida',
  estado: 'estado',
  fechaEntrada: 'fechaEntrada',
  fechaEstadoCambio: 'fechaEstadoCambio',
  ingresadoPorId: 'ingresadoPorId',
  notasProveedor: 'notasProveedor',
  createdAt: 'createdAt'
};

exports.Prisma.SalidaTemporalScalarFieldEnum = {
  id: 'id',
  unidadMedicamentoId: 'unidadMedicamentoId',
  medicoId: 'medicoId',
  autorizadoPorId: 'autorizadoPorId',
  fechaSalida: 'fechaSalida',
  fechaRegreso: 'fechaRegreso',
  estadoRegreso: 'estadoRegreso',
  notas: 'notas',
  createdAt: 'createdAt'
};

exports.Prisma.BajaMedicamentoScalarFieldEnum = {
  id: 'id',
  unidadMedicamentoId: 'unidadMedicamentoId',
  tipo: 'tipo',
  justificacion: 'justificacion',
  registradoPorId: 'registradoPorId',
  fecha: 'fecha',
  createdAt: 'createdAt'
};

exports.Prisma.AjusteInventarioScalarFieldEnum = {
  id: 'id',
  medicamentoId: 'medicamentoId',
  farmaciaId: 'farmaciaId',
  cantidadAnterior: 'cantidadAnterior',
  cantidadNueva: 'cantidadNueva',
  delta: 'delta',
  costoUnitario: 'costoUnitario',
  justificacion: 'justificacion',
  realizadoPorId: 'realizadoPorId',
  fechaAjuste: 'fechaAjuste',
  createdAt: 'createdAt'
};

exports.Prisma.TratamientoTemplateScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  descripcion: 'descripcion',
  activo: 'activo',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TratamientoTemplateItemScalarFieldEnum = {
  id: 'id',
  templateId: 'templateId',
  medicamentoId: 'medicamentoId',
  dosis: 'dosis',
  unidadDosis: 'unidadDosis',
  orden: 'orden'
};

exports.Prisma.AplicacionTratamientoScalarFieldEnum = {
  id: 'id',
  animalId: 'animalId',
  aplicadoPorId: 'aplicadoPorId',
  fechaAplicacion: 'fechaAplicacion',
  templateId: 'templateId',
  templateSnapshot: 'templateSnapshot',
  notas: 'notas',
  costoTotalCalculado: 'costoTotalCalculado',
  createdAt: 'createdAt'
};

exports.Prisma.AplicacionTratamientoItemScalarFieldEnum = {
  id: 'id',
  aplicacionId: 'aplicacionId',
  medicamentoId: 'medicamentoId',
  dosisAplicada: 'dosisAplicada',
  unidadDosis: 'unidadDosis',
  costoPorMedidaMomento: 'costoPorMedidaMomento',
  costoItemCalculado: 'costoItemCalculado'
};

exports.Prisma.EstadoComederoConfigScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  orden: 'orden',
  color: 'color',
  activo: 'activo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LecturaComedorScalarFieldEnum = {
  id: 'id',
  corralId: 'corralId',
  estadoConfigId: 'estadoConfigId',
  registradoPorId: 'registradoPorId',
  fechaLectura: 'fechaLectura',
  notas: 'notas',
  createdAt: 'createdAt'
};

exports.Prisma.RacionCatalogoScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  descripcion: 'descripcion',
  activo: 'activo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RacionDefinicionScalarFieldEnum = {
  id: 'id',
  corralId: 'corralId',
  definidaPorId: 'definidaPorId',
  catalogoId: 'catalogoId',
  nombre: 'nombre',
  cantidadKgManana: 'cantidadKgManana',
  cantidadKgTarde: 'cantidadKgTarde',
  descripcion: 'descripcion',
  fechaInicio: 'fechaInicio',
  fechaFin: 'fechaFin',
  activa: 'activa',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SurtidoRacionScalarFieldEnum = {
  id: 'id',
  corralId: 'corralId',
  racionDefinicionId: 'racionDefinicionId',
  surtidoPorId: 'surtidoPorId',
  turno: 'turno',
  fechaSurtido: 'fechaSurtido',
  cantidadDefinida: 'cantidadDefinida',
  cantidadSurtida: 'cantidadSurtida',
  diferencia: 'diferencia',
  notas: 'notas',
  createdAt: 'createdAt'
};

exports.Prisma.UsuarioScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  nombre: 'nombre',
  apellido: 'apellido',
  email: 'email',
  passwordHash: 'passwordHash',
  tipo: 'tipo',
  activo: 'activo',
  ultimoAcceso: 'ultimoAcceso',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UsuarioActividadScalarFieldEnum = {
  id: 'id',
  usuarioId: 'usuarioId',
  actividad: 'actividad'
};

exports.Prisma.UsuarioGrupoCorralesScalarFieldEnum = {
  id: 'id',
  usuarioId: 'usuarioId',
  grupoCorralesId: 'grupoCorralesId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  usuarioId: 'usuarioId',
  entidad: 'entidad',
  entidadId: 'entidadId',
  accion: 'accion',
  datosAnteriores: 'datosAnteriores',
  datosNuevos: 'datosNuevos',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.NotificacionScalarFieldEnum = {
  id: 'id',
  organizacionId: 'organizacionId',
  autorId: 'autorId',
  titulo: 'titulo',
  mensaje: 'mensaje',
  prioridad: 'prioridad',
  expiraEn: 'expiraEn',
  createdAt: 'createdAt'
};

exports.Prisma.NotificacionDestinatarioScalarFieldEnum = {
  id: 'id',
  notificacionId: 'notificacionId',
  usuarioId: 'usuarioId'
};

exports.Prisma.NotificacionLecturaScalarFieldEnum = {
  id: 'id',
  notificacionId: 'notificacionId',
  usuarioId: 'usuarioId',
  leidaEn: 'leidaEn',
  confirmadaEn: 'confirmadaEn'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.SexoAnimal = exports.$Enums.SexoAnimal = {
  MACHO: 'MACHO',
  HEMBRA: 'HEMBRA'
};

exports.EstadoAnimal = exports.$Enums.EstadoAnimal = {
  ACTIVO: 'ACTIVO',
  EGRESADO: 'EGRESADO',
  MUERTO: 'MUERTO',
  BAJA: 'BAJA'
};

exports.CausaEgresoAnimal = exports.$Enums.CausaEgresoAnimal = {
  VENTA: 'VENTA',
  MUERTE: 'MUERTE',
  TRASLADO: 'TRASLADO',
  OTRO: 'OTRO'
};

exports.EstadoAreteBlanco = exports.$Enums.EstadoAreteBlanco = {
  DISPONIBLE: 'DISPONIBLE',
  ASIGNADO: 'ASIGNADO'
};

exports.PresentacionMedicamento = exports.$Enums.PresentacionMedicamento = {
  FRASCO: 'FRASCO',
  AMPOLLETA: 'AMPOLLETA',
  TABLETA: 'TABLETA',
  SOBRE: 'SOBRE',
  TUBO: 'TUBO',
  JERINGA: 'JERINGA',
  OTRO: 'OTRO'
};

exports.UnidadMedida = exports.$Enums.UnidadMedida = {
  ML: 'ML',
  L: 'L',
  GR: 'GR',
  KG: 'KG',
  TABLETA: 'TABLETA',
  UNIDAD: 'UNIDAD'
};

exports.EstadoUnidadMedicamento = exports.$Enums.EstadoUnidadMedicamento = {
  PRE_INGRESO: 'PRE_INGRESO',
  DISPONIBLE: 'DISPONIBLE',
  SALIDA_TEMPORAL: 'SALIDA_TEMPORAL',
  CONSUMIDO: 'CONSUMIDO',
  BAJA: 'BAJA'
};

exports.EstadoRegreso = exports.$Enums.EstadoRegreso = {
  REGRESO_CON_CONTENIDO: 'REGRESO_CON_CONTENIDO',
  REGRESO_VACIO: 'REGRESO_VACIO'
};

exports.TipoBajaMedicamento = exports.$Enums.TipoBajaMedicamento = {
  CONSUMO_CAMPO: 'CONSUMO_CAMPO',
  CADUCIDAD: 'CADUCIDAD',
  PERDIDA: 'PERDIDA',
  ROBO: 'ROBO',
  DANO: 'DANO',
  AJUSTE: 'AJUSTE'
};

exports.TurnoRacion = exports.$Enums.TurnoRacion = {
  MANANA: 'MANANA',
  TARDE: 'TARDE'
};

exports.TipoUsuario = exports.$Enums.TipoUsuario = {
  SUPERUSUARIO: 'SUPERUSUARIO',
  DIRECTOR: 'DIRECTOR',
  OPERADOR: 'OPERADOR'
};

exports.ActividadUsuario = exports.$Enums.ActividadUsuario = {
  REGISTRO: 'REGISTRO',
  TRATAMIENTOS: 'TRATAMIENTOS',
  COMEDEROS: 'COMEDEROS',
  RACIONES: 'RACIONES',
  FARMACIA: 'FARMACIA',
  REPORTES: 'REPORTES'
};

exports.AccionAudit = exports.$Enums.AccionAudit = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

exports.PrioridadNotificacion = exports.$Enums.PrioridadNotificacion = {
  INFO: 'INFO',
  AVISO: 'AVISO',
  CRITICA: 'CRITICA'
};

exports.Prisma.ModelName = {
  Organizacion: 'Organizacion',
  Farmacia: 'Farmacia',
  GrupoCorrales: 'GrupoCorrales',
  Corral: 'Corral',
  Lote: 'Lote',
  Animal: 'Animal',
  AreteBlanco: 'AreteBlanco',
  AsignacionAreteBlanco: 'AsignacionAreteBlanco',
  Medicamento: 'Medicamento',
  UnidadMedicamento: 'UnidadMedicamento',
  SalidaTemporal: 'SalidaTemporal',
  BajaMedicamento: 'BajaMedicamento',
  AjusteInventario: 'AjusteInventario',
  TratamientoTemplate: 'TratamientoTemplate',
  TratamientoTemplateItem: 'TratamientoTemplateItem',
  AplicacionTratamiento: 'AplicacionTratamiento',
  AplicacionTratamientoItem: 'AplicacionTratamientoItem',
  EstadoComederoConfig: 'EstadoComederoConfig',
  LecturaComedor: 'LecturaComedor',
  RacionCatalogo: 'RacionCatalogo',
  RacionDefinicion: 'RacionDefinicion',
  SurtidoRacion: 'SurtidoRacion',
  Usuario: 'Usuario',
  UsuarioActividad: 'UsuarioActividad',
  UsuarioGrupoCorrales: 'UsuarioGrupoCorrales',
  AuditLog: 'AuditLog',
  Notificacion: 'Notificacion',
  NotificacionDestinatario: 'NotificacionDestinatario',
  NotificacionLectura: 'NotificacionLectura'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
