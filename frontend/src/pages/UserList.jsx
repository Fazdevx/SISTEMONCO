import { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  Search,
  Edit,
  Trash2,
  User as UserIcon,
  Shield,
  MapPin,
  MoreVertical,
  Building2,
  X,
  Filter
} from 'lucide-react';
import { mammographyApi, establishmentApi } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import UserModal from '../components/UserModal';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [establecimientos, setEstablecimientos] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userApi.getAll();
        setUsers(res.data);
      } catch (error) {
        console.error('Error al cargar usuarios:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

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

  const filteredUsers = users.filter(u => {
    const matchesSearch = !search ||
      u.nombres?.toLowerCase().includes(search.toLowerCase()) ||
      u.auth_user?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesRol = !filterRol || u.rol === filterRol;

    const matchesEst = !filterEstablecimiento || u.establecimiento?.id === filterEstablecimiento;

    return matchesSearch && matchesRol && matchesEst;
  });

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await userApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('No se pudo eliminar el usuario');
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Administra el personal y los permisos de acceso al sistema</p>
        </div>

        <button
          onClick={() => {
            setSelectedUserId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-accent transition-all active:scale-95"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Control Bar Mejorada */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-medium dark:text-white"
            />
          </div>

          <div className="md:col-span-3 relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all text-sm font-bold text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">Cualquier Rol</option>
              <option value="admin">Administrador</option>
              <option value="usuario">Usuario Estándar</option>
            </select>
          </div>

          <div className="md:col-span-3 relative">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={filterEstablecimiento}
              onChange={(e) => setFilterEstablecimiento(e.target.value)}
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
                setFilterRol('');
                setFilterEstablecimiento('');
              }}
              title="Limpiar filtros"
              className="w-full h-full flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl text-slate-400 hover:text-accent hover:bg-accent-soft dark:hover:bg-accent-soft/20 transition-all"
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
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Usuario</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Rol / Permisos</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Establecimiento</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence mode="wait">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-8 py-8" colSpan="4">
                        <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredUsers.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-accent-soft/30 dark:hover:bg-indigo-900/10 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-2xl group-hover:bg-accent-soft/30 dark:group-hover:bg-indigo-900/30 transition-colors text-slate-500 dark:text-slate-300 group-hover:text-accent font-bold text-lg w-12 h-12 flex items-center justify-center">
                            {u.nombres?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-800 dark:text-white">{u.nombres || 'Sin nombre'}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">{u.auth_user?.email || 'S/E'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${u.rol === 'admin' ? 'bg-accent-soft text-accent border border-accent-soft'
                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}>
                          <Shield size={12} />
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 dark:text-slate-400 font-bold">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-slate-300" />
                          {u.establecimiento?.nombre || 'Acceso Global'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(u.id);
                              setIsModalOpen(true);
                            }}
                            className="p-2.5 text-slate-400 hover:text-accent hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100"
                          >
                            <Trash2 size={18} />
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
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUserId}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
