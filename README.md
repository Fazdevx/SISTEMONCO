# <p align="center">🏥 ONCO - SISTEM</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-ISC-orange" alt="License">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Tailwind-61DAFB" alt="Frontend">
  <img src="https://img.shields.io/badge/Database-Supabase%20%7C%20PostgreSQL-3ECF8E" alt="Database">
</p>

---

## 🌟 Descripción General

**ONCO - SISTEM** es una solución "Full-Stack" de alto rendimiento diseñada para la **gestión, monitoreo y análisis oncológico**. El sistema optimiza el flujo de trabajo clínico permitiendo el seguimiento preciso de tamizajes de mamografía, la gestión de resultados críticos (BI-RADS) y la automatización inteligente de datos masivos.

> [!IMPORTANT]
> Diseñado específicamente para reducir la brecha entre la captura de datos manual y el análisis clínico oportuno.

---

## 🛠️ Tech Stack & Arquitectura

### 💻 Frontend (The "Eye")
| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **UI Framework** | React 19 + Vite | Renderizado ultra-rápido y DX superior. |
| **Styling** | Tailwind CSS 4 | Diseño atómico y responsivo. |
| **Animations** | Framer Motion | Feedback visual y transiciones fluidas. |
| **Charts** | Chart.js | Visualización de KPIs y tendencias. |
| **Icons** | Lucide React | Iconografía vectorial moderna. |

### ⚙️ Backend (The "Brain")
- **Core:** Node.js v18+ & Express 5 (Next-gen routing).
- **Database & Auth:** Supabase (PostgreSQL) para integridad referencial y seguridad robusta.
- **Data Engine:** XLSX (SheetJS) con algoritmos de normalización personalizados.
- **Real-time:** WebSockets (ws) para sincronización de procesos pesados.

---

## 📂 Estructura del Ecosistema

```bash
ONCO - SISTEM/
├── 🚀 backend/           # Lógica de API & Data Processing
│   ├── 🛠️ config/        # Supabase client & settings
│   ├── 🎮 controllers/   # Request handlers
│   ├── 🛤️ routes/        # Endpoint definitions
│   ├── 🧠 services/      # Business logic (Excel Engine, DB Services)
│   └── 🔧 utils/         # Validators, Normalizers & Loggers
├── 🎨 frontend/          # SPA (Single Page Application)
│   ├── 🧩 components/    # Reusable UI Blocks
│   ├── 🧪 contexts/      # Global State Management
│   └── 📖 pages/         # View compositions
└── 📁 uploads/           # Buffer para archivos .xlsx
```

---

## 🚦 Guía de Inicio Rápido

### 1️⃣ Clonación y Dependencias
```bash
# Clonar el core
git clone <repo-url>
cd ONCO - SISTEM

# Levantar el cerebro (Backend)
cd backend && npm install

# Levantar la vista (Frontend)
cd ../frontend && npm install
```

### 2️⃣ Variables de Entorno (.env)
Configura los archivos `.env` en sus respectivas carpetas:

**Backend:**
```ini
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
```

**Frontend:**
```ini
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Funcionalidades Elite

- **⚡ Excel Smart-Import:** Motor que mapea columnas automáticamente, normaliza DNI/Nombres y detecta colisiones de datos.
- **📊 Dashboard Biométrico:** Resumen ejecutivo de tamizajes, tasas de positividad y metas mensuales.
- **🎯 Tracking BI-RADS:** Sistema de alerta temprana para casos 4 y 5 con flujo de referencia directo.
- **🌓 Adaptive UI:** Soporte nativo para Modo Oscuro/Claro basado en preferencias de sistema.

---

## 📜 Licencia
Distribuido bajo la licencia **ISC**. © 2026 **ONCO - SISTEM Team**.
