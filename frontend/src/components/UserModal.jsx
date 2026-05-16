import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Mail, Shield, MapPin, Loader2, Lock } from 'lucide-react';
import { userApi, establishmentApi } from '../../services/api';

export default function UserModal({ isOpen, onClose, userId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [formData, setFormData] = useState({
    nombres: '',
    email: '',
    password: '',
    rol: 'establecimiento',
    establecimiento_id: '',
  });

  useEffect(() => {
    const loadAllData = async () => {
      if (!isOpen) return;

      try {
        // 1. Cargar establecimientos siempre
        const estRes = await establishmentApi.getEstablecimientos();
        setEstablecimientos(estRes.data || []);

        // 2. Si hay ID, cargar usuario
        if (userId) {
          setInitialLoading(true);
          const userRes = await userApi.getById(userId);
          const u = userRes.data;
          console.log('DATOS CARGADOS EN MODAL:', u);
          
          if (u) {
            setFormData({
              nombres: u.nombres || '',
              email: u.email || '',
              password: '',
              rol: u.rol || 'establecimiento',
              establecimiento_id: u.establecimiento_id || '',
            });
          }
        } else {
          // Reset para nuevo usuario
          setFormData({
            nombres: '',
            email: '',
            password: '',
            rol: 'establecimiento',
            establecimiento_id: '',
          });
        }
      } catch (err) {
        console.error('Error al cargar datos en modal:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    loadAllData();
  }, [isOpen, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (userId) {
        await userApi.update(userId, formData);
      } else {
        await userApi.create(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      alert('Error al guardar usuario');
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
            className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
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
                      {userId ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
                      Control de Acceso al Sistema
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      <User size={12} /> Nombres Completos
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                      <Mail size={12} /> Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>

                  {!userId && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Lock size={12} /> Contraseña
                      </label>
                      <input
                        type="password"
                        required={!userId}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <Shield size={12} /> Rol
                      </label>
                      <select
                        required
                        value={formData.rol}
                        onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      >
                        <option value="admin">Administrador</option>
                        <option value="microred">Microred</option>
                        <option value="establecimiento">Establecimiento</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        <MapPin size={12} /> Sede
                      </label>
                      <select
                        value={formData.establecimiento_id}
                        onChange={(e) => setFormData({ ...formData, establecimiento_id: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                      >
                        <option value="">Acceso Global</option>
                        {establecimientos.map(est => (
                          <option key={est.id} value={est.id}>{est.nombre}</option>
                        ))}
                      </select>
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
                      {userId ? 'GUARDAR' : 'CREAR'}
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
