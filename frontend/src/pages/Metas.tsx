import { useState } from 'react';
import { useMammographyStats } from '../hooks/queries/useMammographies';
import { 
  Target, 
  Search, 
  Filter, 
  TrendingUp, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { getProgressColor, getProgressTextColor } from '../utils/colors';

export default function Metas() {
  const { data: stats, isLoading: loading, error } = useMammographyStats();
  const establishments = stats?.allEstablecimientos || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMicrored, setSelectedMicrored] = useState('Todas');
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
  const { isDark } = useTheme();

  const microredes = ['Todas', ...new Set(establishments.map(e => e.microred))];

  const filtered = establishments
    .filter(e => {
      const matchesSearch = e.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMicrored = selectedMicrored === 'Todas' || e.microred === selectedMicrored;
      return matchesSearch && matchesMicrored;
    })
    .sort((a, b) => b.cantidad - a.cantidad);

  const totalMetaGlobal = filtered.reduce((acc, curr) => acc + curr.meta, 0);
  const totalAtencionesGlobal = filtered.reduce((acc, curr) => acc + curr.cantidad, 0);
  const globalPercentage = totalMetaGlobal > 0 ? (totalAtencionesGlobal / totalMetaGlobal) * 100 : 0;

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Cargando metas...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3">
        <AlertCircle /> Error al cargar las metas de los establecimientos
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Target className="text-accent" size={32} />
            Metas y Avances
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Seguimiento de metas anuales por establecimiento</p>
        </div>
        
        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <button 
            onClick={() => setViewType('grid')}
            className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-accent text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewType('list')}
            className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-accent text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <List size={20} />
          </button>
        </div>
      </header>

      {/* Resumen Global */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-accent to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-accent/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          <div>
            <p className="text-white/80 font-medium mb-1">Avance Global Seleccionado</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-black">{globalPercentage.toFixed(1)}%</h2>
              <span className="text-white/60 text-lg">de la meta</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between text-sm font-bold">
              <span>{totalAtencionesGlobal.toLocaleString()} Atenciones</span>
              <span>Meta: {totalMetaGlobal.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden backdrop-blur-sm border border-white/10">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(globalPercentage, 100)}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="bg-white h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>
          <div className="flex justify-end hidden md:flex">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <TrendingUp size={48} className="text-white/40" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar establecimiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-white shadow-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            value={selectedMicrored}
            onChange={(e) => setSelectedMicrored(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-white shadow-sm appearance-none cursor-pointer"
          >
            {microredes.map(m => <option key={m as string} value={m as string}>{m as string}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 px-4 flex items-center justify-between shadow-sm">
          <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Resultados:</span>
          <span className="font-bold text-slate-800 dark:text-white">{filtered.length}</span>
        </div>
      </div>

      {/* Lista de Establecimientos */}
      <div className="min-h-[400px]">
        {viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((est) => {
              const hasMeta = est.meta > 0;
              const percentage = hasMeta ? (est.cantidad / est.meta) * 100 : 0;
              const isCompleted = percentage >= 100;
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  key={est.nombre}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                      <Building2 size={24} />
                    </div>
                    {isCompleted && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-full">
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-accent transition-colors">
                      {est.nombre}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{est.microred}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Progreso</p>
                        <p className={`text-2xl font-black ${getProgressTextColor(percentage)}`}>
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Atenciones</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {est.cantidad} <span className="text-slate-400 font-medium">/ {est.meta || '∞'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)} ${isCompleted ? 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' : ''}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Establecimiento</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Microred</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Anual</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Avance</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map((est) => {
                    const hasMeta = est.meta > 0;
                    const percentage = hasMeta ? (est.cantidad / est.meta) * 100 : 0;
                    return (
                      <tr key={est.nombre} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{est.nombre}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-400 uppercase">{est.microred}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-600 dark:text-slate-400">{est.meta || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800 dark:text-white">{est.cantidad}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${getProgressTextColor(percentage)}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Building2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No se encontraron resultados</h3>
          <p className="text-slate-500 dark:text-slate-400">Intenta ajustar los filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
}
