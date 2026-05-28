const nodemailer = require("nodemailer");
const supabase = require("../config/supabase");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Contraseña de aplicación de Google
  },
});

const sendPositiveCaseAlert = async (userEmail, patientData) => {
  const mailOptions = {
    from: `"ONCO-SISTEM Alertas" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `⚠️ URGENTE: Hallazgo Crítico - DNI: ${patientData.dni}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #d32f2f; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Alerta de Hallazgo Crítico</h1>
        </div>

        <div style="padding: 30px; color: #333;">
          <p>Estimado(a) profesional,</p>
          <p>Se ha detectado un resultado con categoría <strong>BI-RADS 4 o superior</strong> que requiere atención inmediata:</p>

          <div style="background-color: #fff4f4; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px; color: #666;"><strong>Paciente:</strong></td><td>${patientData.nombres}</td></tr>
              <tr><td style="padding: 5px; color: #666;"><strong>DNI:</strong></td><td>${patientData.dni}</td></tr>
              <tr><td style="padding: 5px; color: #666;"><strong>Resultado:</strong></td><td style="color: #d32f2f; font-weight: bold;">${patientData.birads_mx}</td></tr>
              <!-- Sugerencia: añadir establecimiento si está disponible -->
              ${patientData.establecimiento ? `<tr><td style="padding: 5px; color: #666;"><strong>Sede:</strong></td><td>${patientData.establecimiento}</td></tr>` : ""}
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/positive-cases"
               style="background-color: #d32f2f; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Gestionar Seguimiento
            </a>
          </div>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; font-size: 11px; color: #777; border-top: 1px solid #eee;">
          <p><strong>Aviso de Confidencialidad:</strong> Este mensaje contiene información de salud protegida. El acceso no autorizado es estrictamente prohibido y puede estar sujeto a sanciones legales.</p>
          <p>Enviado automáticamente por ONCO-SISTEM • ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};
const notifyPositiveCases = async (positiveCases) => {
  try {
    if (positiveCases.length === 0) return;

    // 1. Obtener usuarios con notificaciones activadas
    const { data: users, error } = await supabase
      .from("perfiles")
      .select("id, notificaciones_email")
      .eq("notificaciones_email", true);

    if (error) throw error;
    if (users.length === 0) return;

    // 2. Obtener emails de Auth para esos usuarios
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // 3. Enviar correos
    for (const caseData of positiveCases) {
      const patientInfo = {
        nombres: caseData.nombres,
        dni: caseData.dni,
        birads_mx: caseData.birads_mx,
      };

      for (const userProfile of users) {
        const authUser = authUsers.find((u) => u.id === userProfile.id);
        if (authUser && authUser.email) {
          console.log(
            `📧 Enviando alerta de caso positivo a: ${authUser.email}`,
          );
          await sendPositiveCaseAlert(authUser.email, patientInfo);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error en notifyPositiveCases:", error);
  }
};

module.exports = { sendPositiveCaseAlert, notifyPositiveCases };
