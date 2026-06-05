export interface Paciente {
  dni: string;
  nombres: string;
  telefono?: string;
  edad?: number;
  direccion?: string;
  distrito?: string;
  historia_clinica?: string;
}

export interface Establecimiento {
  id: string;
  nombre: string;
}

export interface Atencion {
  id?: string;
  fecha?: string;
  paciente: Paciente;
  establecimiento?: Establecimiento;
}

export interface Mamografia {
  id: string;
  birads_mx?: string;
  resultados_mx?: string;
  sugerencia_mx?: string;
  atencion: Atencion;
  fue_llamado?: boolean;
  fecha_biopsia?: string;
  fue_referido?: boolean;
  notas_seguimiento?: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombres?: string;
  rol?: string;
  establecimiento?: Establecimiento;
}

export interface Perfil {
  id: string;
  nombres?: string;
  rol?: string;
  establecimiento_id?: string;
}

export interface Stats {
  totalPacientes: number;
  casosPositivos: number;
  biradsListos: number;
}
