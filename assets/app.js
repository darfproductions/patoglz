// Código compartido: conexión, sesión, estados de pedido y fórmulas.
(function () {
  const cfg = window.GC_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  const ESTADOS = [
    { key: "cotizacion_solicitada", label: "Cotización solicitada", color: "#8A7A6A" },
    { key: "cotizado",              label: "Cotizado",              color: "#B7791F" },
    { key: "confirmado",            label: "Confirmado",            color: "#2B6CB0" },
    { key: "en_produccion",         label: "En producción",         color: "#6B46C1" },
    { key: "en_camino",             label: "En camino",             color: "#C05621" },
    { key: "entregado",             label: "Entregado",             color: "#2F855A" },
    { key: "cancelado",             label: "Cancelado",             color: "#C53030" }
  ];
  const estado = k => ESTADOS.find(e => e.key === k) || { key: k, label: k, color: "#666" };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fecha = d => d ? new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fechaHora = d => d ? new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const dinero = n => n == null ? "—" : Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  const num = n => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });
  const folio = id => "GC-" + String(id).padStart(5, "0");

  // Fórmula de lámina regular (cm) y pedido mínimo. Mantener igual que en index.html.
  const MINIMO_M2 = 400;
  const laminaRegular = (L, A, H) => [2 * L + 2 * A + 4, A + H];
  function calculo(L, A, H, Q) {
    if (!(L > 0 && A > 0 && H > 0)) return null;
    const [lL, lA] = laminaRegular(+L, +A, +H);
    const m2 = lL * lA / 10000;
    return { lL, lA, m2, total: Q > 0 ? m2 * Q : null, minCajas: Math.ceil(MINIMO_M2 / m2) };
  }

  async function sesion() {
    if (!client) return { user: null, profile: null };
    const { data: { session } } = await client.auth.getSession();
    if (!session) return { user: null, profile: null };
    const { data: profile } = await client.from("profiles").select("*").eq("id", session.user.id).single();
    return { user: session.user, profile };
  }

  function badge(k) {
    const e = estado(k);
    return `<span class="badge" style="--c:${e.color}">${esc(e.label)}</span>`;
  }

  window.GC = { client, configured, ESTADOS, estado, badge, esc, fecha, fechaHora, dinero, num, folio, MINIMO_M2, laminaRegular, calculo, sesion };
})();
