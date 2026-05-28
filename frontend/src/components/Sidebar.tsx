import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Settings,
  Users,
  User,
  Activity,
  ChevronRight,
  AlertTriangle,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar({ onLogout }) {
  const { user, perfil, isAdmin } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: ClipboardList, label: "Mamografías", path: "/mamografias" },
    { icon: AlertTriangle, label: "Casos Positivos", path: "/casos-positivos" },
    { icon: Target, label: "Metas", path: "/metas" },
    ...(isAdmin ? [{ icon: Users, label: "Usuarios", path: "/usuarios" }] : []),
    { icon: Settings, label: "Configuración", path: "/configuracion" },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-2 rounded-4xl border-slate-100 dark:border-slate-700 flex flex-col h-206.75   sticky left-3 top-3 z-50 transition-colors duration-300">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="bg-accent p-2.5 rounded-2xl shadow-lg shadow-accent">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-md tracking-tight text-slate-800 dark:text-white leading-none">
              ONCO - SISTEM
            </h1>
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">
              Prevención Cáncer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-6 space-y-2 mt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group
              ${
                isActive
                  ? "bg-accent text-white shadow-xl shadow-accent font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-accent"
              }
            `}
          >
            <div className="flex items-center gap-4">
              <item.icon
                size={20}
                className="transition-transform group-hover:scale-110"
              />
              <span className="text-sm tracking-tight">{item.label}</span>
            </div>
            <ChevronRight
              size={16}
              className={`opacity-0 group-hover:opacity-100 transition-all ${item.path === window.location.pathname ? "hidden" : ""}`}
            />
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-600 p-2 rounded-2xl shadow-sm text-accent shrink-0">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black text-slate-800 dark:text-white truncate uppercase">
                {perfil?.nombres || user?.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                {perfil?.rol || "Usuario"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all font-bold text-sm group"
        >
          <LogOut
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
