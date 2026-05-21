import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mammographyApi, establishmentApi } from '../../services/api';
import {
  AlertTriangle,
  Search,
  User,
  Calendar,
  Activity,
  Building2,
  Phone,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  X,
  History
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import PatientHistoryModal from '../components/PatientHistoryModal';
import { Mamografia } from '../types';
import { usePositiveCases, useMammographyExport } from '../hooks/queries/useMammographies';
import { useEstablecimientos } from '../hooks/queries/useEstablishments';
import { useMemo } from 'react';
import toast from 'react-hot-toast';

const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?[456][ABC]?/i;

const extraerBirads = (raw: string | null | undefined) => {
  if (!raw) return null;
  const match = (raw + '').match(/BI-RADS[:\s]*(.+)/i);
  return match ? match[1].trim() : (raw + '').trim();
};

const getBiradsStyle = (birads: string | null) => {
  if (!birads) return 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-600';
  const b = birads.toUpperCase();
  if (b.includes('4')) return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800';
  if (b.includes('5')) return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700';
  if (b.includes('6')) return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100';
  return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
};

export default function PositiveCases() {
  const { isAdmin, perfil } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterBirads, setFilterBirads] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const LIMIT = 15;

  const { data: establecimientos = [] } = useEstablecimientos();

  const apiFilters = useMemo(() => {
    const f: any = { soloPositivos: true };
    if (!isAdmin && perfil?.establecimiento_id) {
      f.establecimiento_id = perfil.establecimiento_id;
    }
    return f;
  }, [isAdmin, perfil]);

  const { data: rawPositivos = [], isLoading: loading, refetch } = usePositiveCases(apiFilters);

  // Historial Paciente
  const [historyDni, setHistoryDni] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Establecer filtro inicial si no es admin
  useEffect(() => {
    if (!isAdmin && perfil?.establecimiento_id && establecimientos.length > 0) {
      const miEst = establecimientos.find((e: any) => e.id === perfil.establecimiento_id);
      if (miEst) {
        setFilterEstablecimiento(miEst.nombre);
      }
    }
  }, [isAdmin, perfil, establecimientos]);

  useEffect(() => {
    if (rawPositivos && Array.isArray(rawPositivos) && rawPositivos.length > 0) {
      toast(`Alerta: Tienes ${rawPositivos.length} casos positivos que requieren seguimiento prioritario.`, {
        icon: '🚨',
        duration: 6000,
        style: {
          border: '1px solid #ef4444',
          background: '#0f172a',
          color: '#ffffff',
        },
      });
    }
  }, [!!rawPositivos]);

  const filteredAndSortedCases = useMemo(() => {
    const list = Array.isArray(rawPositivos) ? rawPositivos : (Array.isArray(rawPositivos?.data) ? rawPositivos.data : []);
    let positivos = list.filter((m: Mamografia) => POSITIVOS_REGEX.test((m.birads_mx || '').trim()));

    const seen = new Map();
    positivos.sort((a: Mamografia, b: Mamografia) => {
      const dateA = a.atencion?.fecha ? new Date(a.atencion.fecha).getTime() : 0;
      const dateB = b.atencion?.fecha ? new Date(b.atencion.fecha).getTime() : 0;
      return dateB - dateA;
    });
    positivos.forEach((m: Mamografia) => {
      const dni = m.atencion?.paciente?.dni;
      if (dni && !seen.has(dni)) {
        seen.set(dni, m);
      } else if (!dni) {
        seen.set(`nodni_${m.id}`, m);
      }
    });
    positivos = Array.from(seen.values());

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      positivos = positivos.filter((m: Mamografia) =>
        m.atencion?.paciente?.nombres?.toLowerCase().includes(q) ||
        m.atencion?.paciente?.dni?.includes(q)
      );
    }

    if (filterBirads) {
      positivos = positivos.filter((m: Mamografia) => extraerBirads(m.birads_mx) === filterBirads);
    }

    if (filterEstablecimiento) {
      positivos = positivos.filter((m: Mamografia) =>
        m.atencion?.establecimiento?.nombre === filterEstablecimiento
      );
    }
    return positivos;
  }, [rawPositivos, debouncedSearch, filterBirads, filterEstablecimiento]);

  const total = filteredAndSortedCases.length;
  const from = (page - 1) * LIMIT;
  const cases = filteredAndSortedCases.slice(from, from + LIMIT);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  const handleExport = async () => {
    try {
      const filters: any = { soloPositivos: true };
      if (debouncedSearch) filters.dni = debouncedSearch;
      if (filterBirads) filters.birads_mx = filterBirads;
      if (!isAdmin && perfil?.establecimiento_id) {
        filters.establecimiento_id = perfil.establecimiento_id;
      }

      const res = await mammographyApi.export(filters);
      let data: Mamografia[] = res.data;

      data = data.filter(m => POSITIVOS_REGEX.test((m.birads_mx || '').trim()));

      const headers = ['DNI', 'Paciente', 'Fecha', 'BI-RADS', 'Establecimiento', 'Teléfono', 'Resultado'];
      const rows = data.map(m => [
        m.atencion?.paciente?.dni,
        m.atencion?.paciente?.nombres,
        m.atencion?.fecha,
        m.birads_mx,
        m.atencion?.establecimiento?.nombre,
        m.atencion?.paciente?.telefono,
        m.resultados_mx?.replace(/,/g, ';')
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `reporte_casos_positivos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('No se pudo generar la exportación');
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle size={22} className="text-rose-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Casos Positivos
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Pacientes con BI-RADS 4, 5 o 6 — Seguimiento prioritario
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3.5 rounded-2xl font-bold shadow-sm transition-all active:scale-95"
          >
            <Download size={20} />
            Exportar
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-600 text-white px-5 py-3 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 dark:shadow-rose-900/40 flex items-center gap-2"
          >
            <AlertTriangle size={18} />
            {loading ? '...' : total} casos
          </motion.div>
          <button
            onClick={() => refetch()}
            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Alertas de contexto */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 mb-8 flex items-start gap-4"
      >
        <AlertTriangle size={20} className="text-rose-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-rose-800 dark:text-rose-300 text-sm">Pacientes con resultado positivo en mamografía</p>
          <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
            Se muestran casos únicos con BI-RADS 4 (A, B, C), 5 o 6.
            Los duplicados son excluidos automáticamente. Requieren seguimiento médico prioritario.
          </p>
        </div>
      </motion.div>

      {/* Barra de filtros mejorada */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por DNI o nombre de paciente..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-medium dark:text-white"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterBirads}
              onChange={e => { setFilterBirads(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Todos los Nivel 4</option>
              {['4', '4A', '4B', '4C'].map(v => (
                <option key={v} value={v}>Categoría {v}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={e => { setFilterEstablecimiento(e.target.value); setPage(1); }}
              disabled={!isAdmin}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <option value="">{isAdmin ? 'Todas las Sedes' : 'Mi Sede'}</option>
              {establecimientos.map(est => (
                <option key={est.id} value={est.nombre}>{est.nombre}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              onClick={() => {
                setSearch('');
                setFilterBirads('');
                if (isAdmin) setFilterEstablecimiento('');
                setPage(1);
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-rose-50/60 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-800">
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Paciente</th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">BI-RADS MX</th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Establecimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Fecha Atención</th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Contacto</th>
                <th className="px-8 py-5 text-[10px] font-black text-rose-400 dark:text-rose-500 uppercase tracking-[0.2em]">Resultado MX</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-8" colSpan={6}>
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <AlertTriangle size={48} className="text-slate-200" />
                        <p className="font-bold">No se encontraron casos positivos</p>
                        <p className="text-xs">Intenta cambiar los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((m: Mamografia, idx) => {
                    const label = extraerBirads(m.birads_mx || null);
                    return (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="hover:bg-rose-50/20 dark:hover:bg-rose-900/10 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="bg-rose-100 p-3 rounded-2xl group-hover:bg-rose-200 transition-colors">
                              <User size={18} className="text-rose-600" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-800 dark:text-white">
                                {m.atencion?.paciente?.nombres || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                DNI: {m.atencion?.paciente?.dni || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${getBiradsStyle(m.birads_mx || null)}`}>
                            <Activity size={12} />
                            <p className="text-[10px] w-[65px]">BI-RADS {label || '?'}</p>
                          </span>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Building2 size={14} className="text-slate-300 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {m.atencion?.establecimiento?.nombre || '—'}
                            </span>
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Calendar size={14} className="text-slate-300" />
                            {m.atencion?.fecha || '—'}
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                            <Phone size={14} className="text-slate-300" />
                            {m.atencion?.paciente?.telefono || 'Sin teléfono'}
                          </div>
                        </td>

                        <td className="px-8 py-5">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-xs text-slate-500 font-medium max-w-[200px] truncate">
                              {m.resultados_mx || m.sugerencia_mx || '—'}
                            </p>
                            <button
                              onClick={() => {
                                setHistoryDni(m.atencion?.paciente?.dni || null);
                                setIsHistoryOpen(true);
                              }}
                              title="Ver Historial"
                              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                            >
                              <History size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="px-8 py-6 bg-rose-50/30 dark:bg-slate-700/30 border-t border-rose-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
            {total} CASOS ÚNICOS POSITIVOS
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-600 rounded-2xl shadow-lg shadow-red-800 text-white font-black text-sm">
                {page} <span className="opacity-50 text-[10px]">DE</span> {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <PatientHistoryModal
        dni={historyDni}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}