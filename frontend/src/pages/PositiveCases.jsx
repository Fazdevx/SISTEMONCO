import { useEffect, useState } from 'react';
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
  X
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';


const POSITIVOS_REGEX = /^\s*(BI-RADS[:\s]*)?4[ABC]?/i;

const extraerBirads = (raw) => {
  if (!raw) return null;
  const match = (raw + '').match(/BI-RADS[:\s]*(.+)/i);
  return match ? match[1].trim() : (raw + '').trim();
};

const esPositivo = (raw) => {
  const label = extraerBirads(raw);
  return label ? POSITIVOS_REGEX.test(label) : false;
};

const getBiradsStyle = (birads) => {
  if (!birads) return 'bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-600';
  const b = birads.toUpperCase();
  if (b.includes('4')) return 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800';
  if (b.includes('5')) return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700';
  if (b.includes('6')) return 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100';
  return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800';
};

export default function PositiveCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterBirads, setFilterBirads] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [establecimientos, setEstablecimientos] = useState([]);
  const LIMIT = 15;

  const fetchCases = async () => {
    setLoading(true);
    try {
      // Pasamos el objeto de filtros correctamente { soloPositivos: true }
      const res = await mammographyApi.getAll(1, 1000, { soloPositivos: true });
      let positivos = (res.data?.data || []);

      // Refuerzo de seguridad: filtrar localmente solo BI-RADS 4
      positivos = positivos.filter(m => POSITIVOS_REGEX.test((m.birads_mx || '').trim()));

      // Deduplicar por DNI (mantener el registro más reciente)
      const seen = new Map();
      positivos.sort((a, b) => new Date(b.atencion?.fecha) - new Date(a.atencion?.fecha));
      positivos.forEach(m => {
        const dni = m.atencion?.paciente?.dni;
        if (dni && !seen.has(dni)) {
          seen.set(dni, m);
        } else if (!dni) {
          // Si no tiene DNI, lo dejamos (podría ser un error de dato)
          seen.set(`nodni_${m.id}`, m);
        }
      });
      positivos = Array.from(seen.values());

      // Filtro de búsqueda local con valor debounced
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        positivos = positivos.filter(m =>
          m.atencion?.paciente?.nombres?.toLowerCase().includes(q) ||
          m.atencion?.paciente?.dni?.includes(q)
        );
      }

      // Filtro por BI-RADS
      if (filterBirads) {
        positivos = positivos.filter(m => extraerBirads(m.birads_mx) === filterBirads);
      }

      // Filtro por Establecimiento
      if (filterEstablecimiento) {
        positivos = positivos.filter(m =>
          m.atencion?.establecimiento?.nombre === filterEstablecimiento
        );
      }

      setTotal(positivos.length);
      // Paginación local
      const from = (page - 1) * LIMIT;
      setCases(positivos.slice(from, from + LIMIT));
    } catch (err) {
      console.error('Error al cargar casos positivos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCases();
  }, [page, debouncedSearch, filterBirads, filterEstablecimiento]);

  useEffect(() => {
    const loadEstablecimientos = async () => {
      try {
        const res = await establishmentApi.getEstablecimientos();
        setEstablecimientos(res.data || []);
      } catch (err) {
        console.error('Error al cargar establecimientos:', err);
      }
    };
    loadEstablecimientos();
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-600 text-white px-5 py-3 rounded-2xl font-black text-lg shadow-xl shadow-rose-200 dark:shadow-rose-900/40 flex items-center gap-2"
          >
            <AlertTriangle size={18} />
            {loading ? '...' : total} casos
          </motion.div>
          <button
            onClick={() => fetchCases()}
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
          {/* Buscador principal */}
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

          {/* Filtro BI-RADS */}
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

          {/* Filtro Establecimiento */}
          <div className="md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={e => { setFilterEstablecimiento(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Todas las Sedes</option>
              {establecimientos.map(est => (
                <option key={est.id} value={est.nombre}>{est.nombre}</option>
              ))}
            </select>
          </div>

          {/* Botón limpiar */}
          <div className="md:col-span-1">
            <button
              onClick={() => {
                setSearch('');
                setFilterBirads('');
                setFilterEstablecimiento('');
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

      {/* Tabla */}
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
              <AnimatePresence mode="wait">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-8" colSpan="6">
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <AlertTriangle size={48} className="text-slate-200" />
                        <p className="font-bold">No se encontraron casos positivos</p>
                        <p className="text-xs">Intenta cambiar los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cases.map((m, idx) => {
                    const label = extraerBirads(m.birads_mx);
                    return (
                      <motion.tr
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="hover:bg-rose-50/20 dark:hover:bg-rose-900/10 transition-colors group"
                      >
                        {/* Paciente */}
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

                        {/* BI-RADS */}
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${getBiradsStyle(m.birads_mx)}`}>
                            <Activity size={12} />
                            <p className="text-[10px] w-[65px]">BI-RADS {label || '?'}</p>
                          </span>
                        </td>

                        {/* Establecimiento */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Building2 size={14} className="text-slate-300 shrink-0" />
                            <span className="truncate max-w-[200px]">
                              {m.atencion?.establecimiento?.nombre || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                            <Calendar size={14} className="text-slate-300" />
                            {m.atencion?.fecha || '—'}
                          </div>
                        </td>

                        {/* Contacto */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold">
                            <Phone size={14} className="text-slate-300" />
                            {m.atencion?.paciente?.telefono || 'Sin teléfono'}
                          </div>
                        </td>

                        {/* Resultado */}
                        <td className="px-8 py-5">
                          <p className="text-xs text-slate-500 font-medium max-w-[200px] truncate">
                            {m.resultados_mx || m.sugerencia_mx || '—'}
                          </p>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer / Paginación */}
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
    </div>
  );
}
