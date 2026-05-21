import { usePatientHistory } from '../hooks/queries/usePatients';
import {
  X,
  User,
  Calendar,
  FileText,
  Activity,
  Building2,
  MapPin,
  Phone,
  Clock,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getBiradsStyle = (birads) => {
  if (!birads) return 'bg-slate-100 text-slate-500';
  const b = birads.toUpperCase();
  if (b.includes('4') || b.includes('5') || b.includes('6')) return 'bg-rose-100 text-rose-600 border-rose-200';
  if (b.includes('3')) return 'bg-amber-100 text-amber-600 border-amber-200';
  return 'bg-emerald-100 text-emerald-600 border-emerald-200';
};

export default function PatientHistoryModal({ dni, isOpen, onClose }) {
  const { data, isLoading: loading, error } = usePatientHistory(isOpen ? dni : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
              <History className="text-indigo-600 dark:text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                Historial Clínico
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest">
                DNI: {dni}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 font-bold">Cargando historial...</p>
            </div>
          ) : error || !data ? (
            <div className="text-center py-20">
              <p className="text-rose-500 font-bold">
                {error ? 'No se pudo cargar el historial de la paciente.' : 'No se encontró historial para el DNI especificado.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Info Paciente */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white uppercase">{data.paciente.nombres}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edad</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.edad} años</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.telefono || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 lg:col-span-2">
                  <MapPin size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dirección / Distrito</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white uppercase">
                      {data.paciente.direccion || '—'} {data.paciente.distrito ? `(${data.paciente.distrito})` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">H.C.</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">{data.paciente.historia_clinica || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Timeline de Mamografías */}
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock size={20} className="text-indigo-500" />
                  Línea de Tiempo de Atenciones
                </h3>

                <div className="relative border-l-2 border-slate-100 dark:border-slate-700 ml-4 pl-8 space-y-8">
                  {data.historial.length === 0 ? (
                    <p className="text-slate-400 font-bold italic py-4">No hay atenciones previas registradas.</p>
                  ) : (
                    data.historial.map((h, idx) => (
                      <div key={h.id} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-4 border-indigo-500 shadow-sm" />

                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-lg font-black text-slate-800 dark:text-white">
                                {new Date(h.atencion.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getBiradsStyle(h.birads_mx)}`}>
                                {h.birads_mx || 'BI-RADS ?'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-bold bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-xl">
                              <Building2 size={14} />
                              {h.atencion.establecimiento?.nombre || 'Sede desconocida'}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado Mastología / Mamografía</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                {h.resultados_mx || 'Sin detalle de resultado'}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sugerencia</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium italic">
                                "{h.sugerencia_mx || 'Sin sugerencia registrada'}"
                              </p>
                            </div>
                          </div>

                          {(h.atencion.observaciones) && (
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observaciones Generales</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {h.atencion.observaciones}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 text-center bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            ONCO - SISTEM © 2026 — Seguimiento Oncológico
          </p>
        </div>
      </motion.div>
    </div>
  );
}