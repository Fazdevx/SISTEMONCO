import { useState, useEffect } from "react";
import {
  Users,
  Search,
  User,
  Phone,
  MapPin,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePatients, useUpdatePatient } from "../hooks/queries/usePatients";
import PatientHistoryModal from "../components/PatientHistoryModal";
import toast from "react-hot-toast";

export default function PatientManagement() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading, refetch } = usePatients(page, LIMIT, debouncedSearch);
  const { mutate: updatePatient } = useUpdatePatient();

  const [historyDni, setHistoryDni] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = (patient: any) => {
    setEditingPatient({ ...patient });
  };

  const handleSave = () => {
    if (!editingPatient) return;
    updatePatient({
      id: editingPatient.id,
      data: {
        nombres: editingPatient.nombres,
        telefono: editingPatient.telefono,
        direccion: editingPatient.direccion,
        distrito: editingPatient.distrito,
      },
    });
    setEditingPatient(null);
  };

  const total = data?.total || 0;
  const patients = data?.data || [];
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Users size={22} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Gestión de Pacientes
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-1">
            Busca y corrige datos de pacientes registrados en el sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 mb-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por DNI o nombre de paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-sm font-medium dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Paciente
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  DNI
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Teléfono
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Dirección / Distrito
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              <AnimatePresence>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-8 py-8" colSpan={5}>
                          <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-full w-full opacity-50"></div>
                        </td>
                      </tr>
                    ))
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-400">
                        <User size={48} className="text-slate-200" />
                        <p className="font-bold">No se encontraron pacientes</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  patients.map((p: any, idx: number) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/20 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="bg-indigo-100 p-2.5 rounded-xl">
                            <User size={18} className="text-indigo-600" />
                          </div>
                          <div className="text-sm font-bold text-slate-800 dark:text-white">
                            {p.nombres}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {p.dni}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <Phone size={14} className="text-slate-300" />
                          {p.telefono || "—"}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <MapPin size={14} className="text-slate-300" />
                          <span className="truncate max-w-[200px]">
                            {p.direccion ? `${p.direccion}${p.distrito ? `, ${p.distrito}` : ""}` : (p.distrito || "—")}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Editar Datos"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setHistoryDni(p.dni);
                              setIsHistoryOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Ver Historial"
                          >
                            <History size={18} />
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

        <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-black uppercase tracking-widest">
            {total} PACIENTES REGISTRADOS
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 bg-indigo-600 rounded-2xl shadow-lg text-white font-black text-sm">
                {page} <span className="opacity-50 text-[10px]">DE</span>{" "}
                {totalPages}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                    Editar Paciente
                  </h2>
                  <button
                    onClick={() => setEditingPatient(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Nombres Completos
                    </label>
                    <input
                      type="text"
                      value={editingPatient.nombres}
                      onChange={(e) => setEditingPatient({ ...editingPatient, nombres: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-bold dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Teléfono / Celular
                    </label>
                    <input
                      type="text"
                      value={editingPatient.telefono || ""}
                      onChange={(e) => setEditingPatient({ ...editingPatient, telefono: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-bold dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        Distrito
                      </label>
                      <input
                        type="text"
                        value={editingPatient.distrito || ""}
                        onChange={(e) => setEditingPatient({ ...editingPatient, distrito: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-bold dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                        DNI (No editable)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={editingPatient.dni}
                        className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-2xl opacity-70 cursor-not-allowed font-bold dark:text-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                      Dirección
                    </label>
                    <textarea
                      value={editingPatient.direccion || ""}
                      onChange={(e) => setEditingPatient({ ...editingPatient, direccion: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-bold dark:text-white resize-none"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setEditingPatient(null)}
                    className="flex-1 py-4 px-6 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PatientHistoryModal
        dni={historyDni}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
