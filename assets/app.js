// Código compartido por index, cuenta y panel: conexión, sesión, estados de pedido,
// fórmula de lámina y comportamiento común de la interfaz.
(function () {
  const cfg = window.GC_CONFIG || {};
  const configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  // El color de cada estado vive en app.css (--status-<key>).
  const ESTADOS = [
    { key: "cotizacion_solicitada", label: "Cotización solicitada" },
    { key: "cotizado",              label: "Cotizado" },
    { key: "confirmado",            label: "Confirmado" },
    { key: "en_produccion",         label: "En producción" },
    { key: "en_camino",             label: "En camino" },
    { key: "entregado",             label: "Entregado" },
    { key: "cancelado",             label: "Cancelado" }
  ];
  const estado = k => ESTADOS.find(e => e.key === k) || { key: k, label: k };

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fecha = d => d ? new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fechaHora = d => d ? new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  const dinero = n => n == null ? "—" : Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  const num = n => Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });
  const folio = id => "GC-" + String(id).padStart(5, "0");

  // Fórmula de lámina regular (cm) y pedido mínimo: única fuente para cotizador y panel.
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

  const badge = k => `<span class="badge" data-status="${esc(k)}">${esc(estado(k).label)}</span>`;

  // Línea de tiempo: pasos [{label, date, state: "done"|"now"|""}]
  const timeline = pasos => `<ol class="timeline">${pasos.map(p =>
    `<li class="timeline__item${p.state ? " timeline__item--" + p.state : ""}">${esc(p.label)}<span class="timeline__date">${p.date || ""}</span></li>`).join("")}</ol>`;

  // Mensaje de estado en un contenedor .notice: tipo = success | warning | danger | (vacío = info)
  function aviso(el, contenido, tipo = "danger", html = false) {
    el.hidden = !contenido;
    el.className = "notice" + (tipo && tipo !== "info" ? " notice--" + tipo : "");
    el[html ? "innerHTML" : "textContent"] = contenido || "";
  }

  // ---------- Interfaz común ----------
  // Pestañas accesibles: role="tablist" con botones [data-tab]; onSelect(key) muestra el panel.
  function tabs(list, onSelect) {
    const botones = [...list.querySelectorAll("[role=tab]")];
    const elegir = (b, foco) => {
      botones.forEach(x => { const on = x === b; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1; });
      if (foco) b.focus();
      onSelect(b.dataset.tab);
    };
    botones.forEach((b, i) => {
      b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
      b.addEventListener("click", () => elegir(b));
      b.addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); elegir(botones[(i + d + botones.length) % botones.length], true); }
      });
    });
  }

  function iniciarInterfaz() {
    const header = document.querySelector(".site-header");
    if (header) {
      const marcar = () => header.toggleAttribute("data-scrolled", window.scrollY > 8);
      marcar();
      window.addEventListener("scroll", marcar, { passive: true });
    }

    const toggle = document.querySelector(".menu-toggle");
    const nav = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
    if (nav) {
      const abrir = on => { nav.toggleAttribute("data-open", on); toggle.setAttribute("aria-expanded", on); toggle.setAttribute("aria-label", on ? "Cerrar menú" : "Abrir menú"); };
      toggle.addEventListener("click", () => abrir(!nav.hasAttribute("data-open")));
      nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => abrir(false)));
      document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.hasAttribute("data-open")) { abrir(false); toggle.focus(); } });
    }

    const reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
      reveals.forEach(el => io.observe(el));
    } else reveals.forEach(el => el.classList.add("is-visible"));

    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarInterfaz);
  else iniciarInterfaz();

  window.GC = { client, configured, ESTADOS, estado, badge, timeline, aviso, tabs, esc, fecha, fechaHora, dinero, num, folio, MINIMO_M2, laminaRegular, calculo, sesion };
})();
