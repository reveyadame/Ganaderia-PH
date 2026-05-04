export enum TipoUsuario {
  SUPERUSUARIO = 'SUPERUSUARIO',
  DIRECTOR = 'DIRECTOR',
  OPERADOR = 'OPERADOR',
}

export enum ActividadUsuario {
  REGISTRO = 'REGISTRO',
  TRATAMIENTOS = 'TRATAMIENTOS',
  COMEDEROS = 'COMEDEROS',
  RACIONES = 'RACIONES',
  FARMACIA = 'FARMACIA',
  REPORTES = 'REPORTES',
}

export enum SexoAnimal {
  MACHO = 'MACHO',
  HEMBRA = 'HEMBRA',
}

export enum EstadoAnimal {
  ACTIVO = 'ACTIVO',
  EGRESADO = 'EGRESADO',
  MUERTO = 'MUERTO',
  BAJA = 'BAJA',
}

export enum PresentacionMedicamento {
  FRASCO = 'FRASCO',
  AMPOLLETA = 'AMPOLLETA',
  TABLETA = 'TABLETA',
  SOBRE = 'SOBRE',
  TUBO = 'TUBO',
  JERINGA = 'JERINGA',
  OTRO = 'OTRO',
}

export enum UnidadMedida {
  ML = 'ML',
  L = 'L',
  GR = 'GR',
  KG = 'KG',
  TABLETA = 'TABLETA',
  UNIDAD = 'UNIDAD',
}

export enum EstadoUnidadMedicamento {
  PRE_INGRESO = 'PRE_INGRESO',
  DISPONIBLE = 'DISPONIBLE',
  SALIDA_TEMPORAL = 'SALIDA_TEMPORAL',
  CONSUMIDO = 'CONSUMIDO',
  BAJA = 'BAJA',
}

export enum TipoBajaMedicamento {
  CONSUMO_CAMPO = 'CONSUMO_CAMPO',
  CADUCIDAD = 'CADUCIDAD',
  PERDIDA = 'PERDIDA',
  ROBO = 'ROBO',
  DANO = 'DANO',
  AJUSTE = 'AJUSTE',
}

export enum EstadoAreteBlanco {
  DISPONIBLE = 'DISPONIBLE',
  ASIGNADO = 'ASIGNADO',
}

export enum TurnoRacion {
  MANANA = 'MANANA',
  TARDE = 'TARDE',
}

export enum CausaEgresoAnimal {
  VENTA = 'VENTA',
  MUERTE = 'MUERTE',
  TRASLADO = 'TRASLADO',
  OTRO = 'OTRO',
}

export enum PrioridadNotificacion {
  INFO = 'INFO',
  AVISO = 'AVISO',
  CRITICA = 'CRITICA',
}

export enum EstadoRegreso {
  REGRESO_CON_CONTENIDO = 'REGRESO_CON_CONTENIDO',
  REGRESO_VACIO = 'REGRESO_VACIO',
}
