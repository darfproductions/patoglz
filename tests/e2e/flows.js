// Final-destination check: drives the real pages through the four flows
// and records every observable result to JSON so two versions can be diffed.
// Usage: node flows.js <siteRoot> <out.json> [shotsDir]
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");

const [root, outFile, shotsDir] = process.argv.slice(2);
if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
const MOCK = fs.readFileSync(path.join(__dirname, "supabase-mock.js"), "utf8");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };

function serve() {
  return new Promise(r => {
    const s = http.createServer((q, res) => {
      const p = path.join(root, decodeURIComponent(q.url.split("?")[0].split("#")[0]) === "/" ? "index.html" : decodeURIComponent(q.url.split("?")[0]));
      fs.readFile(p, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" }); res.end(b); });
    }).listen(0, () => r(s));
  });
}

const norm = s => (s || "").replace(/\s+/g, " ").trim();
const nums = s => (norm(s).match(/\d[\d,.]*/g) || []).join(" ");

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const out = { errors: [], flows: {} };

  async function newPage(ctx) {
    const page = await ctx.newPage();
    page.on("pageerror", e => out.errors.push(`${page.url()}: ${e.message}`));
    page.on("console", m => { if (m.type() === "error" && !/fonts|favicon|ERR_/.test(m.text())) out.errors.push(`console ${page.url()}: ${m.text()}`); });
    return page;
  }
  async function context(viewport = { width: 1440, height: 900 }) {
    const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({ contentType: "text/javascript", body: MOCK }));
    await ctx.route(/supabase\.co/, r => r.abort());
    // Record outbound WhatsApp windows and mailto navigations instead of leaving the page.
    await ctx.addInitScript(() => {
      window.__sent = [];
      const fakeWin = () => { const w = { closed: false, opener: {}, close() { w.closed = true; } };
        w.location = { set href(u) { window.__sent.push({ via: "window", url: u }); } }; return w; };
      window.open = (u) => { if (u) window.__sent.push({ via: "open", url: u }); return fakeWin(); };
      document.addEventListener("click", e => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) e.preventDefault(); }, true);
    });
    return ctx;
  }
  const mailtoOf = page => new Promise(res => {
    page.once("request", rq => { if (rq.url().startsWith("mailto:")) res(rq.url()); });
    setTimeout(() => res(null), 1500);
  });

  // ---------- F4 / calc numbers: public quoter minimum + resistance assistant ----------
  {
    const ctx = await context(); const page = await newPage(ctx);
    await page.goto(base + "index.html");
    const cases = [[30, 20, 15, ""], [30, 20, 15, 500], [30, 20, 15, 5000], [40, 30, 30, 900], [12.5, 10, 8, 20000], [60, 40, 40, ""]];
    out.flows.minimo = [];
    for (const [L, A, H, Q] of cases) {
      for (const [id, v] of [["largo", L], ["ancho", A], ["alto", H], ["cantidad", Q]]) await page.fill("#" + id, String(v));
      out.flows.minimo.push({ in: [L, A, H, Q], nums: nums(await page.textContent("#calc")), state: await page.$eval("#calc", e => e.classList.contains("ok") ? "ok" : e.classList.contains("warn") ? "warn" : "info") });
    }
    await page.click("#abrirAsistente");
    out.flows.asistente = [];
    for (const [peso, estiba, hum, alm, corr] of [[5, 3, false, false, "Sencillo"], [12, 5, true, false, "Sencillo"], [20, 6, true, true, "Doble"], [80, 10, true, true, "Sencillo"], [8, 1, false, true, "Sencillo"]]) {
      await page.selectOption("#corrugado", corr);
      await page.fill("#largo", "40"); await page.fill("#ancho", "30");
      await page.fill("#pesoCaja", String(peso)); await page.fill("#estiba", String(estiba));
      await page.setChecked("#humedad", hum); await page.setChecked("#almacen", alm);
      out.flows.asistente.push({ in: [peso, estiba, hum, alm, corr], text: norm((await page.textContent("#rec")).replace("Usar esta recomendación", "")) });
    }
    await ctx.close();
  }

  // ---------- F1 cotizar (sin cuenta) → WhatsApp / correo ----------
  async function fillQuote(page) {
    await page.fill("#nombre", "Ana Prueba"); await page.fill("#empresa", "Empaques Demo");
    await page.fill("#tel", "5512345678"); await page.fill("#cantidad", "2500");
    await page.fill("#largo", "40"); await page.fill("#ancho", "30"); await page.fill("#alto", "25");
    await page.selectOption("#corrugado", "Sencillo");
    if (await page.$eval("#asistente", e => e.hidden)) await page.click("#abrirAsistente");
    await page.fill("#pesoCaja", "12"); await page.fill("#estiba", "5"); await page.check("#humedad");
    await page.click("#usarRec");
    await page.check("#reqSuaje"); await page.fill("#lamLargo", "120"); await page.fill("#lamAncho", "80");
    await page.check("#reqImpresion"); await page.fill("#impresionDet", "logo 1 tinta");
    await page.fill("#otros", "separadores"); await page.fill("#producto", "botellas 1 L");
  }
  {
    const ctx = await context(); const page = await newPage(ctx);
    await page.goto(base + "index.html#cotizar");
    // Required-field validation
    await page.click('#quoteForm [data-via="wa"]');
    out.flows.validacion = { focused: await page.evaluate(() => document.activeElement.id), sent: (await page.evaluate(() => window.__sent)).length };
    await fillQuote(page);
    out.flows.cotizarCampos = await page.evaluate(() => ({ corrugado: corrugado.value, flauta: flauta.value, resistencia: resistencia.value }));
    await page.click('#quoteForm [data-via="wa"]');
    await page.waitForTimeout(300);
    out.flows.cotizarWA = await page.evaluate(() => window.__sent.map(s => decodeURIComponent(s.url)));
    const mailP = mailtoOf(page);
    await page.click('#quoteForm [data-via="mail"]');
    out.flows.cotizarMail = (await mailP) && decodeURIComponent(await mailP);
    if (shotsDir) {
      for (const w of [360, 1440]) {
        await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 });
        await page.goto(base + "index.html"); await page.waitForTimeout(400);
        await page.screenshot({ path: `${shotsDir}/index-${w}.png`, fullPage: true });
        out.flows["overflow-index-" + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      }
    }
    await ctx.close();
  }

  // ---------- F2 registro/login → Mis pedidos (con borrador y folio) ----------
  const ctx = await context(); // shared localStorage = shared mock DB for F2/F3
  {
    const page = await newPage(ctx);
    await page.goto(base + "index.html#cotizar");
    await fillQuote(page);
    await page.click('#gate a[href*="modo=registro"]');
    await page.waitForURL(/cuenta\.html/);
    out.flows.registroPrefill = await page.evaluate(() => [rNombre.value, rEmpresa.value, rTel.value]);
    await page.fill("#rEmail", "ana@example.com"); await page.fill("#rPass", "secreta123");
    await page.click('#fRegistro button[type="submit"], #fRegistro button:not([type])');
    await page.waitForURL(/index\.html#cotizar/);
    await page.waitForSelector("#cuentaAviso:not([hidden])");
    out.flows.borradorRecuperado = { aviso: norm(await page.textContent("#cuentaAviso")), resistencia: await page.inputValue("#resistencia"), cantidad: await page.inputValue("#cantidad") };
    out.flows.linkCuenta = await page.textContent("#linkCuenta");
    await page.click('#quoteForm [data-via="wa"]');
    await page.waitForFunction(() => window.__sent.length > 0);
    out.flows.cotizarConCuentaWA = await page.evaluate(() => window.__sent.map(s => decodeURIComponent(s.url)));
    out.flows.folioAviso = norm(await page.textContent("#cuentaAviso"));
    await page.goto(base + "cuenta.html");
    await page.waitForSelector("#vistaPedidos:not([hidden]) .order");
    out.flows.misPedidos = { hola: norm(await page.textContent("#hola")), lista: norm(await page.textContent("#lista")) };
    await page.click(".order");
    await page.waitForSelector("#dlg[open]");
    out.flows.detalleCliente = norm(await page.textContent("#dlg"));
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/cuenta-detalle-${w}.png`, fullPage: false }); }
    await page.click("#dCerrar");
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/cuenta-pedidos-${w}.png`, fullPage: true }); out.flows["overflow-pedidos-" + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
    await page.click("#salir");
    await page.waitForSelector("#vistaAuth:not([hidden])");
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/cuenta-login-${w}.png`, fullPage: true }); out.flows["overflow-login-" + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
    await page.fill("#lEmail", "ana@example.com"); await page.fill("#lPass", "mala");
    await page.click('#fLogin button');
    await page.waitForSelector("#lMsg:not([hidden])");
    out.flows.loginMalo = norm(await page.textContent("#lMsg"));
    await page.fill("#lPass", "secreta123"); await page.click('#fLogin button');
    await page.waitForSelector("#vistaPedidos:not([hidden]) .order");
    out.flows.loginOK = norm(await page.textContent("#lista"));
    await page.click("#salir"); await page.waitForSelector("#vistaAuth:not([hidden])");
    await page.close();
  }

  // ---------- F3 staff → cambiar estado ----------
  {
    const page = await newPage(ctx);
    await page.goto(base + "cuenta.html?modo=registro");
    await page.fill("#rNombre", "Staff Uno"); await page.fill("#rTel", "5500000000");
    await page.fill("#rEmail", "pgonzalezcastro1@gmail.com"); await page.fill("#rPass", "staffpass1");
    await page.click('#fRegistro button');
    await page.waitForSelector("#vistaPedidos:not([hidden])");
    out.flows.staffLink = await page.$eval("#linkPanel", e => !e.hidden);
    await page.goto(base + "panel.html");
    await page.waitForSelector("#tbody tr[data-id]");
    out.flows.panelTabla = norm(await page.textContent("#tbody"));
    out.flows.panelConteos = norm(await page.textContent("#counts"));
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/panel-pedidos-${w}.png`, fullPage: true }); out.flows["overflow-panel-" + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.click("#tbody tr[data-id]");
    await page.waitForSelector("#dlg[open] #fEdit");
    out.flows.panelDetalle = nums(await page.textContent("#dBody"));
    await page.selectOption("#eStatus", "cotizado");
    await page.fill("#ePrecio", "18500.5"); await page.fill("#eFecha", "2026-11-20");
    await page.fill("#eMsg", "Precio con flete incluido"); await page.fill("#eNotas", "cliente nuevo");
    await page.click('#fEdit button[type="submit"], #fEdit button:not([type])');
    await page.waitForFunction(() => { const m = document.getElementById("eMsgOut"); return m && !m.hidden; });
    out.flows.staffGuardar = { msg: norm(await page.textContent("#eMsgOut")), ok: await page.$eval("#eMsgOut", e => e.classList.contains("ok")), historial: norm(await page.textContent("#dBody .timeline")) };
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/panel-detalle-${w}.png` }); }
    await page.click("#dCerrar");
    out.flows.panelTablaDespues = norm(await page.textContent("#tbody"));
    // Calculadora de lámina
    await page.click('[data-tab="calc"]');
    out.flows.calc = [];
    for (const [L, A, H, Q] of [[30, 20, 15, ""], [30, 20, 15, 500], [40, 30, 25, 2500], [12.5, 10, 8, 20000], [100, 80, 60, 50]]) {
      for (const [id, v] of [["cL", L], ["cA", A], ["cH", H], ["cQ", Q]]) await page.fill("#" + id, String(v));
      out.flows.calc.push({ in: [L, A, H, Q], nums: nums(await page.textContent("#cRes")), cumple: await page.evaluate(() => { const s = document.querySelector("#cRes .status-line"); return s ? (s.classList.contains("ok") ? "ok" : "warn") : null; }) });
    }
    await page.click("#limpiar");
    await page.fill("#pegar", out.flows.cotizarWA[0].replace(/^https:\/\/wa\.me\/\d+\?text=/, ""));
    await page.click("#leer");
    out.flows.calcPegado = { med: await page.evaluate(() => [cL.value, cA.value, cH.value, cQ.value]), nums: nums(await page.textContent("#cRes")), extra: norm(await page.textContent("#cExtra")) };
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/panel-calc-${w}.png`, fullPage: true }); out.flows["overflow-calc-" + w] = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
    await page.click('[data-tab="clientes"]');
    out.flows.clientes = norm(await page.textContent("#tbodyCli"));
    if (shotsDir) for (const w of [360, 1440]) { await page.setViewportSize({ width: w, height: w === 360 ? 780 : 900 }); await page.waitForTimeout(200); await page.screenshot({ path: `${shotsDir}/panel-clientes-${w}.png`, fullPage: true }); }
    await page.click("#salir"); await page.waitForURL(/cuenta\.html/);
    // Cliente ve el nuevo estado
    await page.goto(base + "cuenta.html");
    await page.fill("#lEmail", "ana@example.com"); await page.fill("#lPass", "secreta123"); await page.click("#fLogin button");
    await page.waitForSelector("#vistaPedidos:not([hidden]) .order");
    out.flows.clienteVeEstado = norm(await page.textContent("#lista"));
    await page.click(".order"); await page.waitForSelector("#dlg[open]");
    out.flows.clienteDetalleTrasStaff = norm(await page.textContent("#dlg"));
    await page.close();
  }
  await ctx.close();
  await browser.close(); server.close();
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("errors:", out.errors.length, out.errors.slice(0, 5));
})().catch(e => { console.error(e); process.exit(1); });
