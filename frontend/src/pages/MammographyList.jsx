import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Activity,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Building2,
  X
} from 'lucide-react';
import { mammographyApi, establishmentApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import MammographyModal from '../components/MammographyModal';

export default function MammographyList() {
  const { isAdmin } = useAuth();
  const [mammographies, setMammographies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterBirads, setFilterBirads] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [establecimientos, setEstablecimientos] = useState([]);

  // Lógica de Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchMammographies = async () => {
      setLoading(true);
      try {
        const filters = {};
        if (debouncedSearch) filters.dni = debouncedSearch;
        if (filterBirads) filters.birads_mx = filterBirads;
        if (filterEstablecimiento) filters.establecimiento_id = filterEstablecimiento;

        const res = await mammographyApi.getAll(page, 10, filters);
        setMammographies(res.data.data);
        setTotal(res.data.total);
      } catch (error) {
        console.error('Error al cargar:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMammographies();
  }, [page, debouncedSearch, filterBirads, filterEstablecimiento]);

  useEffect(() => {
    const loadEstablecimientos = async () => {
      try {
        const res = await establishmentApi.getEstablecimientos();
        setEstablecimientos(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    loadEstablecimientos();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    try {
      await mammographyApi.delete(id);
      setMammographies(prev => prev.filter(m => m.id !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('No se pudo eliminar el registro');
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Registro de Mamografías</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoreo y gestión de pacientes tamizados en el sistema</p>
        </div>

        <button
          onClick={() => {
            setSelectedId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-accent transition-all active:scale-95"
        >
          <Plus size={20} />
          Nueva Atención
        </button>
      </div>

      {/* Control Bar Mejorada */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por DNI o Nombre de paciente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterBirads}
              onChange={(e) => { setFilterBirads(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Cualquier BI-RADS</option>
              {['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'].map(v => (
                <option key={v} value={v}>Categoría {v}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={(e) => { setFilterEstablecimiento(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Todas las Sedes</option>
              {establecimientos.map(est => (
                <option key={est.id} value={est.id}>{est.nombre}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              onClick={() => {
                setSearch('');
                setFilterBirads('');
                setFilterEstablecimiento('');
                setPage(1);
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
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
              <tr className="bg-slate-50/50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Información Paciente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Fecha Atención</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Resultado BI-RADS</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Establecimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence mode="wait">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-8" colSpan="5">
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  mammographies.map((m) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-accent-soft/30 dark:hover:bg-accent-soft/10 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl group-hover:bg-accent-soft dark:group-hover:bg-accent-soft/30 transition-colors">
                            <User className="text-slate-500 group-hover:text-accent" size={20} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">{m.atencion?.paciente?.nombres || 'S/N'}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{m.atencion?.paciente?.dni || 'Sin DNI'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-bold">
                          <Calendar size={14} className="text-slate-300" />
                          {m.atencion?.fecha}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        {(() => {
                          const raw = (m.birads_mx || '').trim();
                          const match = raw.match(/BI-RADS\s*(.+)/i);
                          const label = match ? match[1].trim() : (raw || 'S/N');
                          const isPositive = /^\s*(BI-RADS[:\s]*)?4[ABC]?/i.test(raw);
                          return (
                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${isPositive
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                              <Activity size={12} />
                              BI-RADS {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-bold truncate max-w-[250px]">
                        {m.atencion?.establecimiento?.nombre || 'Establecimiento no registrado'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedId(m.id);
                              setIsModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-accent hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Edit size={18} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          <button className="p-2.5 text-slate-300 hover:text-slate-600">
                            <MoreVertical size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer info & Pagination */}
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
            SISTEMONCO <span className="mx-2">|</span> {total} REGISTROS ENCONTRADOS
          </span>
          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-2xl shadow-lg shadow-accent/20 text-white font-black text-sm">
              {page} <span className="opacity-50 text-[10px]">DE</span> {totalPages || 1}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <MammographyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mammographyId={selectedId}
        onSuccess={() => {
          // Recargar datos
          setPage(1); // O mantener la página actual
          window.location.reload(); // Forma rápida de recargar por ahora
        }}
      />
    </div>
  );
}