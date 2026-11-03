// In-browser stand-in for supabase-js v2 used only by the test harness.
// Emulates the RLS policies and triggers of supabase/schema.sql so the
// flows behave like production. State lives in localStorage so it
// survives page navigations within the same origin.
(function () {
  const KEY = "__mockdb";
  const STAFF = ["pgonzalezcastro1@gmail.com", "jlcastro48@yahoo.com"];
  const load = () => JSON.parse(localStorage.getItem(KEY) || '{"users":[],"profiles":[],"orders":[],"order_notes":[],"order_history":[],"seq":{"orders":0,"order_history":0},"session":null}');
  const save = db => localStorage.setItem(KEY, JSON.stringify(db));
  // Monotonic fake clock stored with the data so timestamps keep their order across pages.
  const now = db => { db.clock = (db.clock || Date.parse("2026-11-03T16:00:00Z")) + 60000; return new Date(db.clock).toISOString(); };

  function isStaff(db) {
    const uid = db.session && db.session.uid;
    const p = db.profiles.find(p => p.id === uid);
    return !!p && p.role === "staff";
  }
  function canRead(db, table, row) {
    const uid = db.session && db.session.uid;
    if (!uid) return false;
    if (isStaff(db)) return true;
    if (table === "profiles") return row.id === uid;
    if (table === "orders") return row.user_id === uid;
    if (table === "order_history") return db.orders.some(o => o.id === row.order_id && o.user_id === uid);
    return false; // order_notes: solo staff
  }
  function logHistory(db, order) {
    db.order_history.push({ id: ++db.seq.order_history, order_id: order.id, status: order.status, created_at: now(db), created_by: db.session.uid });
  }

  class Query {
    constructor(table) { this.t = table; this.filters = []; this.op = "select"; this.ord = null; this.mode = "many"; this.wantSelect = false; }
    select() { if (this.op === "select") this.op = "select"; else this.wantSelect = true; return this; }
    eq(c, v) { this.filters.push([c, v]); return this; }
    order(c, o) { this.ord = [c, !o || o.ascending !== false]; return this; }
    single() { this.mode = "single"; return this; }
    maybeSingle() { this.mode = "maybe"; return this; }
    insert(v) { this.op = "insert"; this.val = v; return this; }
    update(v) { this.op = "update"; this.val = v; return this; }
    upsert(v) { this.op = "upsert"; this.val = v; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
    match(r) { return this.filters.every(([c, v]) => r[c] === v); }
    out(rows) {
      if (this.mode === "single") return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } };
      if (this.mode === "maybe") return { data: rows[0] || null, error: null };
      return { data: rows, error: null };
    }
    run() {
      const db = load(), uid = db.session && db.session.uid;
      if (!uid) return { data: null, error: { message: "permission denied" } };
      const t = this.t, rows = db[t];
      if (this.op === "select") {
        let r = rows.filter(x => canRead(db, t, x) && this.match(x)).map(x => ({ ...x }));
        if (this.ord) { const [c, asc] = this.ord; r.sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1)); }
        return this.out(r);
      }
      if (this.op === "insert" && t === "orders") {
        const o = { ...this.val, id: ++db.seq.orders, created_at: now(db), updated_at: now(db) };
        if (!isStaff(db)) { o.user_id = uid; o.status = "cotizacion_solicitada"; o.precio = null; o.mensaje_cliente = null; o.fecha_entrega = null; }
        o.status = o.status || "cotizacion_solicitada";
        rows.push(o); logHistory(db, o); save(db);
        return this.out([{ id: o.id }]);
      }
      if (this.op === "update" && t === "orders") {
        const targets = rows.filter(x => canRead(db, t, x) && this.match(x));
        for (const o of targets) {
          const old = o.status;
          if (!isStaff(db)) {
            if (!(["cotizacion_solicitada", "cotizado"].includes(old) && this.val.status === "cancelado")) return { data: null, error: { message: "No autorizado" } };
            o.status = "cancelado";
          } else Object.assign(o, this.val);
          o.updated_at = now(db);
          if (o.status !== old) logHistory(db, o);
        }
        save(db); return { data: null, error: null };
      }
      if (this.op === "upsert" && t === "order_notes") {
        if (!isStaff(db)) return { data: null, error: { message: "new row violates row-level security policy" } };
        const i = rows.findIndex(x => x.order_id === this.val.order_id);
        if (i >= 0) rows[i] = { ...rows[i], ...this.val }; else rows.push({ ...this.val });
        save(db); return { data: null, error: null };
      }
      return { data: null, error: { message: "mock: unsupported " + this.op + " on " + t } };
    }
  }

  const auth = {
    async getSession() {
      const db = load();
      if (!db.session) return { data: { session: null } };
      const u = db.users.find(u => u.id === db.session.uid);
      return { data: { session: { user: { id: u.id, email: u.email } } } };
    },
    async signUp({ email, password, options }) {
      const db = load();
      if (db.users.some(u => u.email === email)) return { data: {}, error: { message: "User already registered" } };
      const id = "u-" + (db.users.length + 1);
      db.users.push({ id, email, password });
      const m = (options && options.data) || {};
      db.profiles.push({ id, email, nombre: m.nombre, empresa: m.empresa, telefono: m.telefono, role: STAFF.includes(email.toLowerCase()) ? "staff" : "cliente", created_at: now(db) });
      db.session = { uid: id }; save(db);
      return { data: { session: db.session, user: { id, email } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const db = load();
      const u = db.users.find(u => u.email === email && u.password === password);
      if (!u) return { data: {}, error: { message: "Invalid login credentials" } };
      db.session = { uid: u.id }; save(db);
      return { data: { session: db.session }, error: null };
    },
    async signOut() { const db = load(); db.session = null; save(db); return { error: null }; },
    async resetPasswordForEmail() { return { error: null }; }
  };

  window.supabase = {
    createClient() {
      return {
        auth,
        from: t => new Query(t),
        channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; }
      };
    }
  };
})();
