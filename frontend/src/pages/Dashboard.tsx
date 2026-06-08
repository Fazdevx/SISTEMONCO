// @ts-nocheck
import { useState, useEffect } from "react";
import { useMammographyStats } from "../hooks/queries/useMammographies";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  ArcElement,
  Legend,
  Tooltip as ChartTooltip,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  Users,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  Building2,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import AllEstablishmentsModal from "../components/AllEstablishmentsModal";
import { getProgressColor, getProgressTextColor } from "../utils/colors";
import toast from "react-hot-toast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

const StatCard = ({ title, value, icon: Icon, color, percentage, isComparison }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start justify-between hover:shadow-md transition-all duration-300"
  >
    <div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
        {title}
      </p>
      <h3 className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">
        {value}
      </h3>
      {percentage !== undefined && (
        <p className={`text-xs mt-2 font-semibold flex items-center gap-1 ${
          isComparison 
            ? (Number(percentage) >= 0 ? 'text-emerald-500' : 'text-rose-500')
            : 'text-rose-500'
        }`}>
          {isComparison ? (
            <>
              {Number(percentage) >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
              {percentage}% vs mes anterior
            </>
          ) : (
            <>
              <TrendingUp size={12} /> {percentage}% del total
            </>
          )}
        </p>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color} shadow-lg shadow-current/20`}>
      <Icon className="text-white" size={24} />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterEstablecimiento, setFilterEstablecimiento] = useState("");
  
  const { data: stats, isLoading: loading, error } = useMammographyStats({ 
    mes: filterMonth,
    establecimiento_id: filterEstablecimiento 
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (stats) {
      const totalMetas = stats.allEstablecimientos.reduce(
        (acc, est) => acc + (est.meta_anual || 0),
        0,
      );
      const percentage =
        totalMetas > 0
          ? ((stats.totalAtencionesAcumulado / totalMetas) * 100).toFixed(1)
          : 0;

      toast(
        `Progreso Anual: ${stats.totalAtencionesAcumulado} atendidos de una meta total de ${totalMetas} (${percentage}%)`,
        {
          icon: "📊",
          duration: 5000,
          style: {
            background: isDark
              ? "rgba(15, 23, 42, 0.7)"
              : "rgba(255, 255, 255, 0.7)",
            color: isDark ? "#ffffff" : "#1f2937",
          },
        },
      );
    }
  }, [!!stats]);

  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Cargando estadísticas...
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-8">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle /> Error al cargar estadísticas
        </div>
      </div>
    );

  const gridColor = isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.05)";
  const textColor = isDark ? "#94a3b8" : "#64748b";

  const monthlyData = {
    labels: stats.atencionesPorMes.map((d) => d.mes),
    datasets: [
      {
        label: "Atenciones",
        data: stats.atencionesPorMes.map((d) => d.cantidad),
        borderColor: "#6366f1",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.4)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "#6366f1",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const biradsData = {
    labels: Object.keys(stats.distribucionBirads),
    datasets: [
      {
        label: "Casos",
        data: Object.values(stats.distribucionBirads),
        backgroundColor: [
          "rgba(148, 163, 184, 0.8)", // 0
          "rgba(16, 185, 129, 0.8)", // 1
          "rgba(245, 158, 11, 0.8)", // 2
          "rgba(249, 115, 22, 0.8)", // 3
          "rgba(239, 68, 68, 0.8)",  // 4
          "rgba(136, 19, 55, 0.8)",  // 5
        ],
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#1e293b" : "#fff",
        titleColor: isDark ? "#fff" : "#1e293b",
        bodyColor: isDark ? "#94a3b8" : "#64748b",
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderWidth: 1,
        padding: 12,
        boxPadding: 4,
        usePointStyle: true,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: textColor, font: { size: 11, weight: '500' } },
      },
      x: { 
        grid: { display: false }, 
        ticks: { color: textColor, font: { size: 11, weight: '500' } } 
      },
    },
  };

  return (
    <div className="space-y-8 p-6  max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-black uppercase tracking-wider rounded-md">Analytics Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
            Panel de Control
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Monitoreo en tiempo real del tamizaje oncológico
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector Establecimiento */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 pl-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none">Establecimiento</span>
              <select
                value={filterEstablecimiento}
                onChange={(e) => setFilterEstablecimiento(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-8 py-0"
              >
                <option value="">Todas las Sedes</option>
                {stats?.establecimientosList?.map(est => (
                  <option key={est.id} value={est.id} className="dark:bg-slate-800">{est.nombre}</option>
                ))}
              </select>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <Building2 className="text-slate-400" size={20} />
            </div>
          </div>

          {/* Selector Periodo */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 pl-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none">Periodo</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent border-none text-sm font-black text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-8 py-0"
              >
                <option value="anual" className="dark:bg-slate-800">Todo el Año (2026)</option>
                {[
                  { val: '2026-01', label: 'Enero 2026' },
                  { val: '2026-02', label: 'Febrero 2026' },
                  { val: '2026-03', label: 'Marzo 2026' },
                  { val: '2026-04', label: 'Abril 2026' },
                  { val: '2026-05', label: 'Mayo 2026' },
                  { val: '2026-06', label: 'Junio 2026' },
                ].map(m => (
                  <option key={m.val} value={m.val} className="dark:bg-slate-800">{m.label}</option>
                ))}
              </select>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <CalendarDays className="text-slate-400" size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={stats.isAnual ? "Atenciones Anuales" : `Atenciones en ${stats.mesSeleccionado}`}
          value={stats.atencionesMes}
          percentage={stats.isAnual ? undefined : stats.diferenciaMes}
          isComparison={!stats.isAnual}
          icon={ClipboardList}
          color="bg-indigo-600"
        />
        <StatCard
          title="Productividad Anual"
          value={stats.totalAtencionesAcumulado}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <StatCard
          title={`BI-RADS 4 (${stats.isAnual ? "Anual" : stats.mesSeleccionado})`}
          value={stats.totalPositivasMes}
          icon={AlertCircle}
          color="bg-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico Tendencia */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <TrendingUp size={20} className="text-indigo-600" />
                Histórico de Tamizajes
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {stats.isAnual ? "Avance mensual durante todo el año" : "Comparativa de los últimos 6 meses"}
              </p>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atenciones</span>
            </div>
          </div>
          <div className="h-[320px]">
            <Line data={monthlyData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico BI-RADS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <div className="mb-8">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
              <Activity size={20} className="text-rose-500" />
              Categorías BI-RADS
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Distribución {stats.isAnual ? "Anual 2026" : `de ${stats.mesSeleccionado}`}</p>
          </div>
          <div className="h-[320px]">
            <Bar 
              data={biradsData} 
              options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  x: { ...chartOptions.scales.x, grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Top Establecimientos / Avance */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
              <Building2
                size={20}
                className="text-indigo-600"
              />
              Resumen de Productividad por Sede
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Avance real vs Meta programada ({stats.isAnual ? "Anual" : stats.mesSeleccionado})</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-accent hover:text-accent-hover text-sm font-bold flex items-center gap-1 transition-colors px-4 py-2 rounded-xl hover:bg-accent/5 border border-transparent hover:border-accent/10"
          >
            Ver todas las sedes <ChevronRight size={16} />
          </button>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                <th className="pb-4 pl-4">Establecimiento</th>
                {(stats?.availableMonths || []).map(m => (
                  <th key={m} className="pb-4 text-center">{m.split('-')[1]}</th>
                ))}
                <th className="pb-4 text-center">Total</th>
                <th className="pb-4 text-center">Meta</th>
                <th className="pb-4 pr-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.allEstablecimientos || []).slice(0, 8).map((est, idx) => {
                const totalReal = (est.avance_mensual || []).reduce((a, b) => a + b, 0);
                const percentage = est.meta_anual > 0 ? (totalReal / est.meta_anual) * 100 : 0;
                
                // Indicador de estado
                let statusIcon = <div className="w-2 h-2 rounded-full bg-slate-300" />;
                let statusText = "Sin Meta";
                let statusColor = "text-slate-400";
                
                if (est.meta_anual > 0) {
                  if (percentage >= 90) {
                    statusIcon = <CheckCircle2 size={14} className="text-emerald-500" />;
                    statusText = "Excelente";
                    statusColor = "text-emerald-600";
                  } else if (percentage >= 50) {
                    statusIcon = <TrendingUp size={14} className="text-amber-500" />;
                    statusText = "En Progreso";
                    statusColor = "text-amber-600";
                  } else {
                    statusIcon = <AlertCircle size={14} className="text-rose-500" />;
                    statusText = "Crítico";
                    statusColor = "text-rose-600";
                  }
                }

                return (
                  <motion.tr 
                    key={est.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-slate-50/50 dark:bg-slate-900/20 hover:bg-white dark:hover:bg-slate-800 transition-all rounded-2xl shadow-sm"
                  >
                    <td className="py-4 pl-4 rounded-l-2xl">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{est.nombre}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{est.microred}</span>
                      </div>
                    </td>
                    {(est.avance_mensual || []).map((count, i) => (
                      <td key={i} className="py-4 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        {count || "-"}
                      </td>
                    ))}
                    <td className="py-4 text-center">
                      <span className="text-xs font-black text-slate-800 dark:text-white bg-white dark:bg-slate-700 px-2 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600">
                        {totalReal}
                      </span>
                    </td>
                    <td className="py-4 text-center text-xs font-bold text-slate-400">
                      {est.meta_anual || "S/N"}
                    </td>
                    <td className="py-4 pr-4 text-right rounded-r-2xl">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          {statusIcon}
                          <span className={`text-[10px] font-black uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{percentage.toFixed(1)}% anual</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AllEstablishmentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        establishments={stats.allEstablecimientos}
        totalAtenciones={stats.totalAtencionesAcumulado}
        mesSeleccionado={stats.mesSeleccionado}
      />
    </div>
  );
}
