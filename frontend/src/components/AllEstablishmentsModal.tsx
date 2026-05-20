import { useState } from 'react';
import { 
  Building2, 
  X, 
  Search 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProgressColor, getProgressTextColor } from '../utils/colors';

const AllEstablishmentsModal = ({ isOpen, onClose, establishments, totalAtenciones }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrar y ordenar: Primero por cantidad, luego alfabéticamente
  const establishmentsArray = Array.isArray(establishments) ? establishments : [];
  
  const filtered = establishmentsArray
    .filter(e => 
      e && e.nombre && e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (b.cantidad !== a.cantidad) {
        return b.cantidad - a.cantidad;
      }
      return a.nombre.localeCompare(b.nombre);
    });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 size={20} className="text-accent" />
                  Productividad por Establecimiento
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Listado completo de avances vs metas anuales</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar establecimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {filtered.map((est, idx) => {
                  const hasMeta = est.meta > 0;
                  const percentage = hasMeta ? Math.min((est.cantidad / est.meta) * 100, 100) : (est.cantidad / totalAtenciones) * 100;
                  const progressColor = hasMeta ? getProgressColor(percentage) : 'bg-slate-400';
                  const progressTextColor = hasMeta ? getProgressTextColor(percentage) : 'text-slate-400';
                  
                  return (
                    <div key={idx} className="relative group">
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {est.nombre}
                          </span>
                          {hasMeta && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Meta: {est.meta}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                            {est.cantidad}
                          </span>
                          {hasMeta && (
                            <span className={`text-[10px] font-bold ${progressTextColor}`}>
                              {percentage.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-200/50 dark:border-slate-600/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={`${progressColor} h-full rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No se encontraron establecimientos con ese nombre.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AllEstablishmentsModal;
