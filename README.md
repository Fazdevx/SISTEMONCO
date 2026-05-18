# SISTEMONCO - Sistema de Monitoreo Oncológico

SISTEMONCO es una plataforma integral diseñada para la gestión, seguimiento y análisis de tamizajes de mamografía. Permite a los profesionales de salud realizar un seguimiento detallado de las pacientes, gestionar resultados (BI-RADS), y automatizar la importación de datos desde reportes de Excel.

## 🚀 Tecnologías

### Frontend
- **React 19**: Biblioteca principal para la interfaz de usuario.
- **Vite**: Herramienta de construcción rápida.
- **Tailwind CSS 4**: Framework de estilos para un diseño moderno y responsivo.
- **Framer Motion**: Animaciones fluidas en la interfaz.
- **Lucide React**: Set de iconos consistentes.
- **Chart.js**: Visualización de estadísticas y métricas en el dashboard.
- **React Router Dom 7**: Gestión de navegación y rutas protegidas.

### Backend
- **Node.js & Express 5**: Entorno de ejecución y framework para la API REST.
- **Supabase**: Backend-as-a-Service para la base de datos PostgreSQL y autenticación.
- **XLSX (SheetJS)**: Procesamiento y normalización de archivos Excel complejos.
- **Dotenv**: Gestión de variables de entorno.

## 🛠️ Estructura del Proyecto

```text
SISTEMONCO/
├── backend/            # API REST, servicios de importación y lógica de negocio
│   ├── config/         # Configuración de base de datos (Supabase)
│   ├── controllers/    # Controladores de las rutas
│   ├── routes/         # Definición de endpoints
│   ├── services/       # Lógica compleja (Excel, normalización, DB)
│   └── utils/          # Helpers y validadores
├── frontend/           # Aplicación Single Page Application (SPA)
│   ├── src/
│   │   ├── components/ # Componentes reutilizables
│   │   ├── contexts/   # Estados globales (Auth, Theme)
│   │   ├── pages/      # Vistas principales de la aplicación
│   │   └── services/   # Clientes de API
└── uploads/            # Almacenamiento temporal para archivos de importación
```

## ⚙️ Configuración e Instalación

### Requisitos Previos
- Node.js (v18 o superior)
- Cuenta en Supabase con las tablas configuradas.

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd SISTEMONCO
   ```

2. **Configurar el Backend:**
   ```bash
   cd backend
   npm install
   ```
   Crea un archivo `.env` en `backend/` con las siguientes variables:
   ```env
   PORT=3000
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_KEY=tu_anon_key_de_supabase
   ```

3. **Configurar el Frontend:**
   ```bash
   cd ../frontend
   npm install
   ```
   Crea un archivo `.env` en `frontend/` con las siguientes variables:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   VITE_API_URL=http://localhost:3000
   ```

4. **Ejecutar el proyecto:**
   - **Backend:** `npm start` (o `node server.js`)
   - **Frontend:** `npm run dev`

## 📊 Funcionalidades Clave

- **Dashboard Estadístico:** Visualización en tiempo real de tamizajes realizados y casos positivos.
- **Gestión de Mamografías:** Listado exhaustivo con filtros por establecimiento, resultado y estado.
- **Seguimiento de Casos Positivos:** Módulo especializado para pacientes con BI-RADS 4 y 5.
- **Importación Inteligente:** Motor de procesamiento de Excel que normaliza datos, detecta duplicados y mapea columnas automáticamente.
- **Gestión de Usuarios:** Control de acceso para administradores y personal de salud.
- **Modo Oscuro/Claro:** Interfaz adaptable a las preferencias del usuario.

## 📄 Licencia
Este proyecto está bajo la Licencia ISC.
