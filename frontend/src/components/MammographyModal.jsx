import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Calendar, MapPin, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { mammographyApi, establishmentApi } from '../../services/api';

export default function MammographyModal({ isOpen, onClose, mammographyId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    fecha: new Date().toISOString().split('T')[0],
    establecimiento_id: '',
    birads: '',
    resultados_mx: '',
    sugerencia_mx: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchEstablecimientos();
      if (mammographyId) {
        fetchMammography();
      } else {
        setFormData({
          dni: '',
          nombres: '',
          fecha: new Date().toISOString().split('T')[0],
          establecimiento_id: '',
          birads: '',
          resultados_mx: '',
          sugerencia_mx: '',
        });
      }
    }
  }, [isOpen, mammographyId]);

  const fetchEstablecimientos = async () => {
    try {
      const res = await establishmentApi.getEstablecimientos();
      setEstablecimientos(res.data);
    } catch (err) {
      console.error('Error al cargar establecimientos:', err);
    }
  };

  const fetchMammography = async () => {
    setInitialLoading(true);
    try {
      const res = await mammographyApi.getById(mammographyId);
      const m = res.data;
      setFormData({
        dni: m.atencion?.paciente?.dni || '',
        nombres: m.atencion?.paciente?.nombres || '',
        fecha: m.atencion?.fecha || '',
        establecimiento_id: m.atencion?.establecimiento_id || '',
        birads: m.birads || '',
        resultados_mx: m.resultados_mx || '',
        sugerencia_mx: m.sugerencia_mx || '',
      });
    } catch (err) {
      console.error('Error al cargar detalle:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mammographyId) {
        await mammographyApi.update(mammographyId, formData);
      } else {
        await mammographyApi.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar los datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
            className="relative bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {initialLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-accent" size={48} />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando datos...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 dark:bg-slate-700/50 px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                      {mammographyId ? 'Editar Atención' : 'Nueva Atención'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                      Registro de Tamizaje Oncológico
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Paciente Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <User size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Información del Paciente</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DNI / Documento</label>
                        <input
                          type="text"
                          required
                          value={formData.dni}
                          onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombres Completos</label>
                        <input
                          type="text"
                          required
                          value={formData.nombres}
                          onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Atención Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 mb-2">
                        <Calendar size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Detalle de Atención</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                        <input
                          type="date"
                          required
                          value={formData.fecha}
                          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Establecimiento</label>
                        <select
                          required
                          value={formData.establecimiento_id}
                          onChange={(e) => setFormData({ ...formData, establecimiento_id: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        >
                          <option value="">Seleccionar...</option>
                          {establecimientos.map(est => (
                            <option key={est.id} value={est.id}>{est.nombre}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Resultados Section */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 text-rose-600 mb-2">
                      <Activity size={18} />
                      <span className="text-xs font-black uppercase tracking-widest">Resultado de Mamografía</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría BI-RADS</label>
                        <select
                          required
                          value={formData.birads}
                          onChange={(e) => setFormData({ ...formData, birads: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        >
                          <option value="">BI-RADS...</option>
                          {['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'].map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hallazgos / Resultados</label>
                        <input
                          type="text"
                          value={formData.resultados_mx}
                          onChange={(e) => setFormData({ ...formData, resultados_mx: e.target.value })}
                          placeholder="Descripción breve..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sugerencias Médicas</label>
                      <textarea
                        value={formData.sugerencia_mx}
                        onChange={(e) => setFormData({ ...formData, sugerencia_mx: e.target.value })}
                        rows="2"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-2xl font-black shadow-xl shadow-accent dark:shadow-accent/40 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {mammographyId ? 'GUARDAR CAMBIOS' : 'REGISTRAR ATENCIÓN'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
