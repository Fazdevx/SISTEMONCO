// @ts-nocheck
import { useState } from "react";
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
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Users,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  Building2,
  CheckCircle2,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import AllEstablishmentsModal from "../components/AllEstablishmentsModal";
import { getProgressColor, getProgressTextColor } from "../utils/colors";
import toast from "react-hot-toast";
import { useEffect } from "react";

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

const StatCard = ({ title, value, icon: Icon, color, percentage }) => (
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
      {percentage && (
        <p className="text-xs mt-2 font-semibold text-rose-500 flex items-center gap-1">
          <TrendingUp size={12} /> {percentage}% del total
        </p>
      )}
    </div>
    <div className={`p-3 rounded-xl ${color} shadow-lg shadow-current/20`}>
      <Icon className="text-white" size={24} />
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { data: stats, isLoading: loading, error } = useMammographyStats();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (stats) {
      const totalMetas = stats.allEstablecimientos.reduce(
        (acc, est) => acc + (est.meta || 0),
        0,
      );
      const percentage =
        totalMetas > 0
          ? ((stats.totalAtenciones / totalMetas) * 100).toFixed(1)
          : 0;

      toast(
        `Progreso General: ${stats.totalAtenciones} atendidos de una meta total de ${totalMetas} (${percentage}%)`,
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
        borderColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-primary"),
        backgroundColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-soft"),
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: getComputedStyle(
          document.documentElement,
        ).getPropertyValue("--accent-primary"),
      },
    ],
  };

  const biradsData = {
    labels: Object.keys(stats.distribucionBirads),
    datasets: [
      {
        data: Object.values(stats.distribucionBirads),
        backgroundColor: [
          "#94a3b8",
          "#10b981",
          "#f59e0b",
          "#f97316",
          "#ef4444",
          "#881337",
        ],
        borderWidth: 0,
      },
    ],
  };

  const microredData = {
    labels: stats.comparativaMicroredes?.map((mr) => mr.nombre) || [],
    datasets: [
      {
        label: "Tamizajes Realizados",
        data: stats.comparativaMicroredes?.map((mr) => mr.cantidad) || [],
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderRadius: 8,
      },
      {
        label: "Meta Programada",
        data: stats.comparativaMicroredes?.map((mr) => mr.meta) || [],
        backgroundColor: "rgba(226, 232, 240, 0.8)",
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
      x: { grid: { display: false }, ticks: { color: textColor } },
    },
    metrics: [
      {
        title: "Exámenes Semanales",
        value: stats?.semanal || 0,
        icon: CalendarDays,
        color: "bg-emerald-500",
        percentage: 0,
      },
      {
        title: "Exámenes Mensuales",
        value: stats?.mensual || 0,
        icon: CalendarDays,
        color: "bg-blue-500",
        percentage: 0,
      },
    ],
  };

  return (
    <div className="space-y-8 p-6  max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Panel de Control
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Resumen general del sistema de tamizaje oncológico
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
          <CheckCircle2 size={14} /> Sistema en línea
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Atenciones Totales"
          value={stats.totalAtenciones}
          icon={ClipboardList}
          color="bg-accent"
        />
        <StatCard
          title="Pacientes Únicos"
          value={stats.totalPacientes}
          icon={Users}
          color="bg-emerald-600"
        />
        <StatCard
          title="Resultados Positivos"
          value={stats.totalPositivas}
          percentage={stats.porcentajePositivas}
          icon={AlertCircle}
          color="bg-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico Tendencia */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8">
            <TrendingUp size={18} className="text-accent" />
            Tendencia de Atenciones
          </h3>
          <div className="h-[300px]">
            <Line data={monthlyData} options={chartOptions} />
          </div>
        </div>

        {/* Gráfico BI-RADS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8">
            <AlertCircle size={18} className="text-rose-600" />
            Distribución BI-RADS
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut
              data={biradsData}
              options={{
                maintainAspectRatio: false,
                cutout: "70%",
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                      color: textColor,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Establecimientos */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2
              size={18}
              className="text-slate-500 dark:text-slate-400"
            />
            Productividad vs Metas (Top 5)
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-accent hover:text-accent-hover text-sm font-bold flex items-center gap-1 transition-colors px-4 py-2 rounded-xl hover:bg-accent/5"
          >
            Ver más <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {stats.topEstablecimientos.map((est, idx) => {
            const hasMeta = est.meta > 0;
            const percentage = hasMeta
              ? Math.min((est.cantidad / est.meta) * 100, 100)
              : (est.cantidad / stats.totalAtenciones) * 100;
            const progressColor = hasMeta
              ? getProgressColor(percentage)
              : "bg-slate-400";
            const progressTextColor = hasMeta
              ? getProgressTextColor(percentage)
              : "text-slate-400";

            return (
              <div key={idx} className="relative group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-accent transition-colors">
                      {est.nombre}
                    </span>
                    {hasMeta && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Meta: {est.meta} tamizajes
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-none">
                      {est.cantidad}
                    </span>
                    {hasMeta && (
                      <span
                        className={`text-[10px] font-bold ${progressTextColor}`}
                      >
                        {percentage.toFixed(1)}% de la meta
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-600/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                      duration: 1.2,
                      ease: "easeOut",
                      delay: idx * 0.1,
                    }}
                    className={`${progressColor} h-full rounded-full shadow-sm relative`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AllEstablishmentsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        establishments={stats.allEstablecimientos}
        totalAtenciones={stats.totalAtenciones}
      />
    </div>
  );
}
