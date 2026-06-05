import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Settings2, 
  Map, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Plus,
  RefreshCcw,
  Building2,
  Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mappingApi, importApi, establishmentApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function ImportManagement() {
  const [activeTab, setActiveTab] = useState('import');
  const [loading, setLoading] = useState(false);
  
  // Estados para Importación
  const [preview, setPreview] = useState<any>(null);
  
  // Estados para Mapeos
  const [estMappings, setEstMappings] = useState<any[]>([]);
  const [colMappings, setColMappings] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  
  const [newEstMapping, setNewEstMapping] = useState({ nombre_excel: '', establecimiento_id: '' });

  useEffect(() => {
    fetchMappings();
    fetchEstablishments();
  }, []);

  const fetchMappings = async () => {
    try {
      const [estRes, colRes] = await Promise.all([
        mappingApi.getEstablecimientos(),
        mappingApi.getColumnas()
      ]);
      setEstMappings(estRes.data);
      setColMappings(colRes.data);
    } catch (error) {
      toast.error('Error al cargar mapeos');
    }
  };

  const fetchEstablishments = async () => {
    try {
      const res = await establishmentApi.getEstablecimientos();
      setEstablishments(res.data);
    } catch (error) {
      toast.error('Error al cargar establecimientos');
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await importApi.getPreview();
      setPreview(res.data.result);
      toast.success('Vista previa generada');
    } catch (error: any) {
      toast.error('Error al generar vista previa: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!window.confirm('¿Estás seguro de que deseas importar los datos válidos?')) return;
    setLoading(true);
    try {
      const res = await importApi.executeImport();
      toast.success(`Importación exitosa: ${res.data.totalImported} registros procesados`);
      setPreview(null);
    } catch (error: any) {
      toast.error('Error en la importación: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddEstMapping = async () => {
    if (!newEstMapping.nombre_excel || !newEstMapping.establecimiento_id) return;
    try {
      await mappingApi.createEstablecimiento(newEstMapping);
      toast.success('Mapeo agregado');
      setNewEstMapping({ nombre_excel: '', establecimiento_id: '' });
      fetchMappings();
    } catch (error) {
      toast.error('Error al agregar mapeo');
    }
  };

  const handleDeleteEstMapping = async (id: number) => {
    try {
      await mappingApi.deleteEstablecimiento(id);
      toast.success('Mapeo eliminado');
      fetchMappings();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Gestión de Importación</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Controla cómo el sistema procesa los archivos Excel</p>
      </div>

      <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8 w-fit">
        {[
          { id: 'import', icon: FileSpreadsheet, label: 'Importación' },
          { id: 'est_mapping', icon: Map, label: 'Establecimientos' },
          { id: 'col_mapping', icon: Settings2, label: 'Columnas Excel' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-accent shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-8 lg:p-12 transition-colors duration-300">
        
        {/* TAB: IMPORTACIÓN */}
        {activeTab === 'import' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Motor de Importación Inteligente</h2>
                <p className="text-sm text-slate-400 font-medium">Sube el archivo "MAMOGRAFIA 2026.xlsx" a la carpeta uploads y genera la vista previa.</p>
              </div>
              <button 
                onClick={handlePreview}
                disabled={loading}
                className="flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-all disabled:opacity-50"
              >
                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                Generar Vista Previa
              </button>
            </div>

            {preview && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Filas</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{preview.totalRows}</p>
                  </div>
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Válidas</p>
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{preview.validRows}</p>
                  </div>
                  <div className="p-6 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-800">
                    <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Con Errores</p>
                    <p className="text-3xl font-black text-rose-700 dark:text-rose-400">{preview.invalidRows}</p>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 border-2 border-rose-100 dark:border-rose-900/30 rounded-3xl overflow-hidden">
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} /> Detalle de Errores Detectados
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-black text-slate-400">Hoja</th>
                            <th className="px-4 py-2 text-left font-black text-slate-400">Fila</th>
                            <th className="px-4 py-2 text-left font-black text-slate-400">DNI/ID</th>
                            <th className="px-4 py-2 text-left font-black text-slate-400">Mensaje de Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {preview.errors.map((err: any, idx: number) => (
                            <tr key={idx} className="hover:bg-rose-50/30">
                              <td className="px-4 py-2 font-bold text-slate-500">{err.sheet}</td>
                              <td className="px-4 py-2 font-bold text-slate-500">{err.row}</td>
                              <td className="px-4 py-2 font-black text-slate-700 dark:text-slate-300">{err.dni || '-'}</td>
                              <td className="px-4 py-2 text-rose-500 font-bold">{err.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {preview.validRows > 0 && (
                  <div className="flex flex-col items-center gap-6 p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-4 rounded-full text-emerald-600">
                      <CheckCircle2 size={40} />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">Listo para Procesar</h3>
                      <p className="text-sm text-slate-400 mt-2 font-medium">Se importarán {preview.validRows} registros correctamente normalizados.</p>
                    </div>
                    <button 
                      onClick={handleExecuteImport}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                    >
                      Ejecutar Importación Ahora
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB: MAPEOS ESTABLECIMIENTOS */}
        {activeTab === 'est_mapping' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Mapeo de Establecimientos</h2>
            <p className="text-sm text-slate-400 font-medium mb-8">Vincula los nombres que vienen en el Excel con los establecimientos del sistema.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Formulario */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                  <h3 className="font-black text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px]">Nuevo Sinónimo</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Nombre tal cual viene en Excel</label>
                      <input 
                        type="text" 
                        placeholder="Ej: HOSPITAL REG. HUACHO"
                        value={newEstMapping.nombre_excel}
                        onChange={e => setNewEstMapping({...newEstMapping, nombre_excel: e.target.value.toUpperCase()})}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-4 focus:ring-accent/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Establecimiento en el Sistema</label>
                      <select 
                        value={newEstMapping.establecimiento_id}
                        onChange={e => setNewEstMapping({...newEstMapping, establecimiento_id: e.target.value})}
                        className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-4 focus:ring-accent/10 appearance-none"
                      >
                        <option value="">Seleccionar establecimiento...</option>
                        {establishments.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={handleAddEstMapping}
                      className="w-full bg-accent text-white py-4 rounded-2xl font-black shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                    >
                      <Plus size={18} /> Guardar Mapeo
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-700/50 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Excel</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {estMappings.map((m: any) => (
                        <tr key={m.id} className="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-700 dark:text-slate-300">{m.nombre_excel}</td>
                          <td className="px-6 py-4">
                            <span className="flex items-center gap-2 text-accent font-bold">
                              <Building2 size={14} /> {m.establecimiento?.nombre}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteEstMapping(m.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB: MAPEOS COLUMNAS */}
        {activeTab === 'col_mapping' && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Configuración de Columnas</h2>
            <p className="text-sm text-slate-400 font-medium mb-8">Define qué nombres de columnas en el Excel corresponden a cada dato del sistema.</p>

            <div className="grid grid-cols-1 gap-4">
              {colMappings.map((m: any) => (
                <div key={m.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="w-48 shrink-0">
                    <div className="flex items-center gap-2 text-accent font-black uppercase tracking-widest text-xs mb-1">
                      <TableIcon size={14} /> {m.campo_sistema}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold">Campo interno</p>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="flex flex-wrap gap-2">
                      {m.nombres_posibles.map((name: string, idx: number) => (
                        <span key={idx} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
                          {name}
                        </span>
                      ))}
                      <button className="px-4 py-2 bg-accent-soft text-accent rounded-xl text-xs font-black flex items-center gap-1 hover:bg-accent hover:text-white transition-all">
                        <Plus size={14} /> Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
