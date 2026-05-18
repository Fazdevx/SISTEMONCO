# <p align="center">📖 Manual de Operaciones - SISTEMONCO</p>

---

## 📑 Tabla de Contenidos
- [🔐 Acceso de Seguridad](#-acceso-de-seguridad)
- [📈 Inteligencia de Datos (Dashboard)](#-inteligencia-de-datos-dashboard)
- [📥 Motor de Importación Excel](#-motor-de-importación-excel)
- [🚨 Gestión de Casos Críticos](#-gestión-de-casos-críticos)
- [🎨 Personalización](#-personalización)

---

## 🔐 Acceso de Seguridad
El sistema implementa un esquema de autenticación **Identity-First**.

1. Ingresa tu correo institucional y contraseña cifrada.
2. El sistema utiliza **JWT** gestionado por Supabase para mantener sesiones seguras.
3. Si pierdes acceso, contacta al administrador del sistema para un reset de credenciales.

---

## 📈 Inteligencia de Datos (Dashboard)
El Dashboard no es solo visual, es una herramienta de toma de decisiones:
*   **KPIs en Vivo**: Conteo total de mamografías vs. Meta mensual.
*   **Mapa de Calor**: Visualiza qué microredes están reportando más casos.
*   **Acciones Rápidas**: Accesos directos a las últimas 5 pacientes registradas.

---

## 📥 Motor de Importación Excel
Esta es la funcionalidad más robusta del sistema. Sigue estos pasos para una carga exitosa:

### 🛠️ Preparación del Archivo
- **Nombre:** Debe ser estrictamente `MAMOGRAFIA 2026.xlsx`.
- **Ubicación:** `backend/uploads/`.
- **Estructura:** El motor busca pestañas llamadas `ENE`, `FEB`, `MAR`, etc.

### 🧠 ¿Qué hace el sistema por ti?
- **Fuzzy Matching:** Si una columna se llama "D.N.I" o "DOCUMENTO", el sistema la reconoce como DNI automáticamente.
- **Data Cleaning:** Elimina espacios extra, formatea nombres a `Mayúsculas` y valida que el DNI tenga 8 dígitos.
- **Logs de Error:** Si una fila falla, no se detiene todo el proceso. El sistema registra el error en `backend/logs/errors.log` y continúa con la siguiente fila.

> [!TIP]
> Puedes ver el progreso de la importación en tiempo real si abres la consola del servidor.

---

## 🚨 Gestión de Casos Críticos
El seguimiento de casos **BI-RADS 4 y 5** es prioridad nacional:

1. Dirígete al módulo **"Casos Positivos"**.
2. Filtra por pacientes pendientes de referencia.
3. Registra la fecha de cita en el **HRH (Hospital Regional)**.
4. Actualiza la situación (Ej: "En Quimioterapia", "Cirugía Programada").

---

## 🎨 Personalización
SISTEMONCO se adapta a tu entorno:
- **Dark Mode:** Ideal para entornos clínicos con baja iluminación para reducir la fatiga visual.
- **Filtros Persistentes:** El sistema recuerda tu última búsqueda en la lista de mamografías durante la sesión activa.

---

<p align="center">
  <sub>SISTEMONCO v1.0.0 - Documentación para Desarrolladores y Usuarios Finales</sub>
</p>
