# Guía de Uso - SISTEMONCO

Esta guía describe los flujos principales para utilizar el Sistema de Monitoreo Oncológico de manera efectiva.

## 🔐 1. Acceso al Sistema
Para ingresar al sistema, debe contar con credenciales activas (correo y contraseña).
- El sistema utiliza **Supabase Auth** para garantizar la seguridad.
- Al iniciar sesión, será redirigido al Dashboard principal.

## 📈 2. Dashboard y Estadísticas
El Dashboard ofrece una vista panorámica del estado actual de los tamizajes:
- **Resumen Mensual**: Cantidad de mamografías realizadas.
- **Casos Críticos**: Acceso directo a pacientes que requieren seguimiento urgente.
- **Gráficos**: Distribución de resultados y productividad por establecimiento.

## 📋 3. Gestión de Mamografías
En la sección de "Mamografías", podrá:
- **Ver Listado**: Una tabla con todos los registros históricos.
- **Filtrar**: Utilice la barra lateral para buscar por DNI, Nombre o filtrar por Establecimiento de salud.
- **Detalle y Edición**: Al hacer clic en una fila, podrá ver el historial completo de la paciente y editar información sobre ecografías, magnificaciones o tratamientos.

## 📥 4. Importación de Datos (Excel)
El sistema permite la carga masiva de datos desde el archivo oficial de seguimiento:
1. Asegúrese de que el archivo se llame `MAMOGRAFIA 2026.xlsx` y esté ubicado en la carpeta `backend/uploads/` (o utilice el módulo de subida si está habilitado).
2. El sistema procesará las pestañas de los meses (ENE, FEB, MAR, etc.).
3. **Validación Automática**: El motor detecta DNI inválidos, nombres vacíos y mapea las columnas aunque cambien de posición.
4. **Normalización**: El sistema limpia espacios en blanco, corrige formatos de fecha y estandariza nombres de establecimientos.

## 🚨 5. Casos Positivos
Este módulo es crítico para el seguimiento oncológico:
- Filtra automáticamente pacientes con resultados **BI-RADS 4 o 5**.
- Permite registrar la fecha de referencia a hospitales de mayor complejidad (HRH).
- Facilita el seguimiento de la situación actual de la paciente (en tratamiento, operada, etc.).

## 👥 6. Administración de Usuarios
Los administradores pueden gestionar el personal con acceso al sistema:
- Crear nuevos usuarios.
- Asignar roles (Próximamente).
- Desactivar cuentas de personal que ya no labora en la institución.

## 🎨 7. Configuración Personal
En el menú de configuración, los usuarios pueden:
- Cambiar entre el **Modo Claro** y **Modo Oscuro**.
- Actualizar información de perfil.

---

**Nota:** Si encuentra errores durante la importación de Excel, revise el archivo `backend/logs/errors.log` para identificar la fila y columna exactas que causaron el problema.
