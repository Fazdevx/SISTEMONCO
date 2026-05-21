# Proyecto ONCO - SISTEM (Fase 1: Mamografías)

¡Hola! Aquí tienes el resumen técnico y funcional de cómo está construido ONCO - SISTEM y qué ventajas te ofrece ahora que estamos lanzando esta **Primera Fase enfocada exclusivamente en tamizaje de mamografías**.

---

## 1. El Stack Tecnológico (¿Con qué está hecho?)
Para que la plataforma sea súper rápida y no se cuelgue, usamos las mismas herramientas que utilizan las empresas de tecnología grandes. No es un programa viejo, todo es web y moderno:

* **Frontend (Lo que tú ves):**
  * **React 18 + Vite:** Hace que la plataforma sea rapidísima. Cuando cambias de ventana, no se recarga la página en blanco.
  * **React Query:** Guarda datos temporalmente (caché). Si entras a ver tus casos y vuelves al inicio, carga todo al instante.
  * **Tailwind CSS + Framer Motion:** Para el diseño visual. Permite tener el *Modo Oscuro* (para no cansarte la vista) y las animaciones suaves (como las ventanas emergentes).
  * **Chart.js:** La herramienta que dibuja los gráficos interactivos del inicio.

* **Backend (El motor detrás de escena):**
  * **Node.js con Express:** Un servidor muy rápido que aguanta que varios centros de salud estén conectados al mismo tiempo sin ponerse lento.

* **Base de Datos y Seguridad:**
  * **Supabase (PostgreSQL):** Una base de datos súper robusta y segura. Es imposible que los datos se mezclen (por ejemplo, cruzar el resultado de una paciente con otra).
  * **Tokens JWT:** Cada vez que entras con tu usuario, el sistema crea una "llave secreta" que asegura que un establecimiento solo pueda ver a sus propios pacientes.

---

## 2. ¿Qué te ofrece el sistema hoy?
En esta primera fase de mamografías, el sistema ya tiene todo esto listo para usarse:

* **Dashboard Visual:** Apenas entras, tienes gráficos y tarjetas de resumen que te dicen exactamente cómo van los despistajes en tiempo real.
* **Alertas de Casos Positivos:** Una pantalla dedicada solo a las pacientes críticas (BI-RADS 4, 5 y 6). Tienen etiquetas de colores brillantes para que ninguna paciente grave se quede sin seguimiento.
* **Línea de Tiempo del Paciente:** Al hacer clic en un DNI, te sale una ventana muy limpia que te muestra todo el historial y atenciones pasadas de esa paciente, ordenado por fechas.
* **Seguimiento de Metas:** Barras de progreso que te muestran visualmente si tu sede o microred está cerca de cumplir la meta anual de tamizajes.
* **100% Adaptable:** Puedes usarlo desde tu laptop, la computadora de la posta o tu celular. El diseño se acomoda a cualquier pantalla.

---

## 3. ONCO - SISTEM vs. Excel (Por qué era necesario el cambio)

Sabemos que Excel es útil para empezar, pero para gestionar salud se queda corto muy rápido. Aquí la diferencia de usar tu nuevo sistema:

| Lo que pasaba en Excel ❌ | Lo que logras con ONCO - SISTEM ✅ |
| :--- | :--- |
| **Buscar era lento:** Tenías que hacer *Control+B*, filtrar columnas y podías borrar celdas por error. | **Búsqueda instantánea:** Escribes un DNI o nombre y te aparece el historial completo como una línea de tiempo limpia y protegida. |
| **Gráficos manuales:** Para ver cómo ibas en el mes, tenías que seleccionar datos y armar tus propios gráficos. | **Dashboard automático:** El sistema calcula los totales, dibuja los gráficos y las barras de meta de avance de manera automática en tiempo real. |
| **Casos graves perdidos:** Una paciente BI-RADS 5 era solo una fila más en un mar de datos blancos. | **Alertas visuales:** El sistema etiqueta con colores llamativos a los casos positivos para que tengan prioridad inmediata. |
| **Archivos pesados:** Mientras más pacientes metías, más demoraba en abrir o guardar el archivo. | **Velocidad en la nube:** Base de datos PostgreSQL que puede guardar un millón de mamografías y seguirá cargando al instante en tu navegador. |
| **Problemas de permisos:** Si le pasabas el Excel a otro centro, podían ver todo o modificar cosas que no debían. | **Cuentas por rol:** Cada establecimiento tiene su propio usuario. Entran, ven solo lo suyo, registran y listo. |

---

¡Esta Fase 1 es solo el inicio! Con esta base sólida ya instalada, escalar para meter otras áreas de oncología será mucho más fluido.
