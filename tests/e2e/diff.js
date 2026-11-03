// Compara el resultado de flows.js contra la línea base del sitio anterior.
// Las claves que deben ser idénticas son los mensajes enviados y los números calculados.
// Uso: node diff.js baseline.json result.json
const fs = require("fs");
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, "utf8")));

const EXACTAS = ["minimo", "asistente", "validacion", "cotizarCampos", "cotizarWA", "cotizarMail",
  "registroPrefill", "borradorRecuperado", "cotizarConCuentaWA", "calc", "calcPegado", "panelDetalle", "staffLink"];
let fallas = 0;
for (const k of EXACTAS) {
  const ok = JSON.stringify(a.flows[k]) === JSON.stringify(b.flows[k]);
  if (!ok) fallas++;
  console.log(`${ok ? "OK   " : "FALLA"} ${k}`);
}
for (const k of Object.keys(b.flows).filter(k => k.startsWith("overflow-"))) {
  const ok = b.flows[k] <= 0;
  if (!ok) fallas++;
  console.log(`${ok ? "OK   " : "FALLA"} ${k} (${b.flows[k]} px de scroll horizontal)`);
}
if (b.errors.length) { fallas++; console.log("FALLA errores JS:", b.errors); }
console.log("\nRevisar a mano (cambian de texto por diseño, deben conservar datos):",
  ["folioAviso", "misPedidos", "detalleCliente", "loginMalo", "loginOK", "panelTabla", "staffGuardar", "panelTablaDespues", "clientes", "clienteVeEstado", "clienteDetalleTrasStaff"].join(", "));
process.exit(fallas ? 1 : 0);
