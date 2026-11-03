// ====== CONFIGURACIÓN ======
// Datos del negocio y conexión con Supabase. Se cargan antes que app.js en las tres páginas.
window.GC_CONFIG = {
  // WhatsApp que recibe las cotizaciones: 52 + número a 10 dígitos
  WHATSAPP: "525513326185",
  // Correos que reciben las cotizaciones enviadas por correo
  EMAILS: ["pgonzalezcastro1@gmail.com", "jlcastro48@yahoo.com"],

  // URL y "publishable key" del proyecto de Supabase (Project Settings → API).
  // Esta llave es pública: la seguridad la dan las reglas (RLS) de supabase/schema.sql.
  // Nunca pongas aquí la llave "service_role" / "secret".
  SUPABASE_URL: "https://efplmefksnrguuadjhrk.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_VdIJs6ZHWaLpwa9k3eWc6w_KDxK4kv7"
};
