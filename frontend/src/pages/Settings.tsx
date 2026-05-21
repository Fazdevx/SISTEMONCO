import { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Palette,
  Save,
  Key,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Moon,
  Sun,
  Monitor,
  Mail,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, perfil: profile } = useAuth();
  const { 
    mode, setMode, 
    accent, setAccent, 
    isDark,
    toastPosition, setToastPosition,
    toastDuration, setToastDuration
  } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Estados para formularios
  const [profileData, setProfileData] = useState({
    nombres: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState<{ [key: string]: any }>({
    email: true,
    push: true,
    weeklyReport: false
  });

  const updateNotificationSetting = (id: string, value: any) => {
    if (id === 'position') {
      setToastPosition(value);
      toast.success(`Posición cambiada a ${value}`, { position: value as any });
    } else if (id === 'duration') {
      setToastDuration(value);
      toast.success(`Duración ajustada a ${value}ms`, { duration: value });
    } else {
      setNotifications(prev => ({ ...prev, [id]: value }));
      toast.success(`${id === 'email' ? 'Correo' : id === 'push' ? 'Push' : 'Reporte'} ${value ? 'activado' : 'desactivado'}`);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: currentProfile } = await supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          setProfileData({
            nombres: currentProfile?.nombres || '',
            email: currentUser.email || ''
          });
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    };
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userApi.update(user.id, { nombres: profileData.nombres });
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error((error as any).response?.data?.error || (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Las contraseñas no coinciden');
    }

    setLoading(true);
    try {
      await userApi.update(user.id, { password: passwordData.newPassword });
      toast.success('Contraseña actualizada con éxito');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', icon: User, label: 'Mi Perfil' },
    { id: 'security', icon: Shield, label: 'Seguridad' },
    { id: 'theme', icon: Palette, label: 'Apariencia' },
    { id: 'notifications', icon: Bell, label: 'Notificaciones' }
  ];

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Personaliza tu entorno de trabajo en ONCO - SISTEM</p>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8 w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
              ? 'bg-white dark:bg-slate-700 text-accent shadow-sm shadow-accent'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] transition-colors duration-300">
        <div className="p-8 lg:p-12">

          {/* Pestaña: Perfil */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <User size={20} />
                </div>
                Información del Usuario
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Nombres Completos</label>
                    <input
                      type="text"
                      placeholder="Cargando..."
                      value={profileData.nombres}
                      onChange={e => setProfileData({ ...profileData, nombres: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                    <input
                      type="email"
                      disabled
                      value={profileData.email}
                      className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-3xl border border-slate-100 dark:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-slate-400" size={20} />
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase">Sede Asignada</p>
                      <p className="font-bold text-slate-700 dark:text-white">{(profile as any)?.establecimiento?.nombre || 'Acceso Centralizado'}</p>
                    </div>
                  </div>
                  <span className="w-fit px-3 py-1 bg-accent-soft text-accent text-[10px] font-black uppercase rounded-lg">
                    Permisos: {profile?.rol}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white py-4 rounded-2xl font-black shadow-xl shadow-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? 'Guardando...' : 'Actualizar Perfil'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Pestaña: Seguridad */}
          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                  <Key size={20} />
                </div>
                Acceso y Seguridad
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="Escribe tu nueva clave"
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Confirmar Nueva Contraseña</label>
                    <input
                      type="password"
                      placeholder="Repite la clave"
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-accent transition-all active:scale-95 disabled:opacity-50"
                >
                  <Shield size={20} />
                  {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Pestaña: Apariencia */}
          {activeTab === 'theme' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                  <Palette size={20} />
                </div>
                Personalización del Tema
              </h2>

              <div className="space-y-10">
                {/* Selector de Modo */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Modo Visual</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', icon: Sun, label: 'Claro' },
                      { id: 'dark', icon: Moon, label: 'Oscuro' },
                      { id: 'system', icon: Monitor, label: 'Sistema' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${mode === m.id
                          ? 'bg-accent border-accent text-white shadow-lg shadow-accent'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <m.icon size={24} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de Color de Acento */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Color de Acento</label>
                  <div className="flex gap-4">
                    {[
                      { id: 'indigo', color: 'bg-[#4f46e5]', label: 'Índigo' },
                      { id: 'emerald', color: 'bg-[#059669]', label: 'Esmeralda' },
                      { id: 'rose', color: 'bg-[#e11d48]', label: 'Rosa' },
                      { id: 'blue', color: 'bg-[#3b82f6]', label: 'Azul' },
                      { id: 'sky', color: 'bg-[#0ea5e9]', label: 'Celeste' },
                      { id: 'purple', color: 'bg-[#7c3aed]', label: 'Morado' },
                      { id: 'pink', color: 'bg-[#ec4899]', label: 'Rosa Fuerte' },
                      { id: 'teal', color: 'bg-[#0d9488]', label: 'Teal' },
                      { id: 'lime', color: 'bg-[#84cc16]', label: 'Lima' },
                      { id: 'amber', color: 'bg-[#f59e0b]', label: 'Ámbar' }
                    ].map(c => (
                      <button
                        key={c.id}
                        onClick={() => setAccent(c.id)}
                        className={`group relative flex flex-col items-center gap-2`}
                      >
                        <div className={`w-12 h-12 rounded-2xl ${c.color} flex items-center justify-center transition-all ${accent === c.id ? 'ring-4 ring-accent/30 scale-110 shadow-lg shadow-accent/20' : 'opacity-40 hover:opacity-100 hover:scale-105'
                          }`}>
                          {accent === c.id && <CheckCircle2 size={20} className="text-white" />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${accent === c.id ? 'text-accent' : 'text-slate-400'}`}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pestaña: Notificaciones */}
          {activeTab === 'notifications' && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  <Bell size={20} />
                </div>
                Configuración de Notificaciones
              </h2>

              <div className="space-y-8">
                {/* Canales */}
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Canales de Comunicación</label>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'email', icon: Mail, label: 'Alertas por Correo', desc: 'Recibe un aviso cuando se detecte un BI-RADS 4' },
                      { id: 'push', icon: Zap, label: 'Notificaciones Push', desc: 'Alertas en tiempo real en tu navegador' },
                      { id: 'weeklyReport', icon: Monitor, label: 'Resumen Semanal', desc: 'Informe estadístico de tamizajes realizados' }
                    ].map(n => (
                      <label
                        key={n.id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400">
                            <n.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{n.label}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{n.desc}</p>
                          </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all relative ${notifications[n.id] ? 'bg-accent' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <input
                            type="checkbox"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            checked={notifications[n.id]}
                            onChange={() => updateNotificationSetting(n.id, !notifications[n.id])}
                          />
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications[n.id] ? 'left-7' : 'left-1'}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personalización Hot-Toast */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Posición en Pantalla</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        'top-left', 'top-center', 'top-right',
                        'bottom-left', 'bottom-center', 'bottom-right'
                      ].map(pos => (
                        <button
                          key={pos}
                          onClick={() => updateNotificationSetting('position', pos)}
                          className={`p-2 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all ${toastPosition === pos
                              ? 'bg-accent border-accent text-white shadow-md shadow-accent/20'
                              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-accent/30'
                            }`}
                        >
                          {pos.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Duración (ms)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range"
                        min="1000"
                        max="10000"
                        step="500"
                        value={toastDuration}
                        onChange={(e) => updateNotificationSetting('duration', parseInt(e.target.value))}
                        className="flex-1 accent-accent"
                      />
                      <span className="w-16 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-black text-accent text-center">
                        {toastDuration}ms
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium italic">Tiempo que la notificación permanece visible.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
