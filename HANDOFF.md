# Traspaso: rediseño del sitio de Gloria Curiel

Contexto para continuar en una sesión local. Rama: `claude/loving-noether-5s80af`.
Borra este archivo cuando el rediseño esté terminado.

## Estado actual: trabajo a medias, el sitio no está listo para publicar

| Archivo | Estado |
|---|---|
| `assets/app.css` | **Reescrito** con el sistema de diseño nuevo: tokens en `:root`, componentes y secciones. |
| `assets/app.js` | **Reescrito**. La API `GC` se mantiene; se agregaron `GC.timeline`, `GC.aviso`, `GC.tabs` y el comportamiento común (encabezado al hacer scroll, menú móvil, `.reveal`, `[data-year]`). |
| `assets/config.js` | **Ampliado** con `WHATSAPP` y `EMAILS`; antes estaban hardcodeados en index.html. |
| `index.html` | **Sin migrar.** Todavía usa su propio `<style>` y su script inline. Funciona, pero no usa el sistema nuevo. |
| `cuenta.html`, `panel.html` | **Sin migrar y rotas visualmente.** Cargan el `app.css` nuevo, pero usan las clases viejas (`btn primary`, `msg err`, `wrap`, `top`…). |
| `tests/e2e/` | Arnés del "final destination check" (ver abajo). |

Siguiente paso: reescribir `index.html`, `cuenta.html` y `panel.html` con las clases del `app.css` nuevo, y sacar los scripts inline a `assets/cotizador.js`, `assets/cuenta.js` y `assets/panel.js`.

## El encargo original (resumen)

- Rediseñar las tres páginas como un sitio profesional de producto, sin perder ninguna función.
- Estructura tomada de https://hermes-agent.nousresearch.com/ (orden de secciones, ritmo, jerarquía tipográfica y layout del hero). Movimiento tomado de openclaw.ai y openai.com. Solo patrones; nada de logos, textos ni identidad de marca.
- **No tocar:** la lógica del cotizador, la fórmula de lámina `(2L + 2A + 4) × (A + H)`, el mínimo de 400 m², la autenticación de Supabase ni `supabase/schema.sql` (RLS).
- Quitar los rasgos de "vibe coding": estilos inline, colores y tamaños sueltos, divs sin semántica, comentarios genéricos, código muerto, glifos usados como íconos (✓ ✗), sombras y gradientes de plantilla.
- Respetar `prefers-reduced-motion`, contraste WCAG AA y 360 px sin scroll horizontal.
- **Entregables:**
  1. tabla de esquema (referencia → sección del sitio → cambio);
  2. cambios por archivo;
  3. hallazgos de los tres revisores (estética, code review, final destination);
  4. los cuatro flujos en OK, con capturas a 360 y 1440 px.
- Los criterios del revisor de estética quedaron como `[PENDIENTE]` en el prompt. Pídelos o usa los de la regla.

## Bloqueo: las referencias no se pudieron ver

En la nube, la política de red bloqueó `hermes-agent.nousresearch.com`, `obsidian.md`, `openclaw.ai` y `openai.com`. El código de la landing de Hermes no es público: el repo `NousResearch/hermes-agent` solo tiene la documentación en `website/` (Docusaurus, `baseUrl: /docs/`), y la raíz se publica con un deploy hook de Vercel. **En local, abre las referencias en el navegador antes de fijar el orden de las secciones**, y cita lo que observes en la tabla de esquema.

El `app.css` nuevo **no** se basó en las referencias. Es una estructura propia:
- encabezado con eyebrows en mono, que gana borde al hacer scroll, y barra de progreso con `animation-timeline`;
- hero en dos columnas;
- franja de datos clave;
- secciones con un índice mono por encima del título;
- pasos con una línea que se dibuja al entrar en pantalla;
- preguntas frecuentes con el encabezado fijo a la izquierda.

Ajusta todo esto a lo que veas en Hermes.

## Decisiones ya tomadas

- **Paleta con contraste AA verificado.** Hoy fallan el blanco sobre `#C38D52` (botón principal) y el blanco sobre `#25D366` (WhatsApp). Los nuevos son `--color-accent: #8A5626` (6.1:1) y `--color-whatsapp: #0B7A3B` (5.4:1).
- **Tipografía.** Montserrat para títulos, Inter para texto y JetBrains Mono para eyebrows, folios y métricas. En el `<head>` de las tres páginas carga: `https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap`.
- **Clase `js` para las animaciones de aparición.** `.reveal` solo oculta contenido si `<html>` tiene la clase `js`. Agrégala en el `<head>` de cada página antes de que se pinte: `<script>document.documentElement.classList.add("js")</script>`. `app.js` ya no la agrega.
- **Badges por atributo.** Los badges de estado usan `data-status` y su color sale de `--status-*` en CSS. Ya no llevan `style="--c:..."`.
- **Validación accesible.** Los campos inválidos se marcan con `aria-invalid="true"`, no con `el.style.borderColor`.
- **Sin glifos en los textos de la interfaz.** Quita los ✓ y ✗; el ícono lo pone `.notice--success` / `.notice--warning`. En la tabla del panel, la columna "Mínimo" muestra "Sí"/"No". **No cambies el texto de los mensajes de WhatsApp y correo**: el panel los lee con una regex que depende de `×` y de las etiquetas `Cantidad:`, etc.
- **Una sola fuente para la fórmula.** El cotizador debe usar `GC.laminaRegular` y `GC.MINIMO_M2` de `app.js` en vez de duplicarlos. El resultado numérico es el mismo.
- **Pestañas.** `GC.tabs(listEl, key => …)` cubre las de cuenta (login/registro) y las de panel. Incluye navegación con flechas.

## Final destination check (`tests/e2e/`)

- `supabase-mock.js` reemplaza a supabase-js en el navegador. Emula las políticas RLS y los triggers de `schema.sql`: el cliente solo ve sus pedidos y solo puede cancelar; el staff edita; `order_history` se llena con cada cambio de estado; los correos de `staff_emails` quedan como staff.
- `flows.js` recorre los cuatro flujos y guarda en JSON todo lo que se puede observar, más capturas a 360 y 1440 px:
  1. cotizar → WhatsApp / correo;
  2. registro con borrador → folio → Mis pedidos → login;
  3. staff cambia el estado → el cliente lo ve;
  4. calculadora de lámina y asistente de resistencia.
- `baseline.json` es el resultado del **sitio anterior** (commit `b9e194f`), con 0 errores.
- `diff.js` exige que los mensajes de WhatsApp y correo, y todos los números, sean idénticos a la línea base, y que no haya scroll horizontal.

```bash
cd tests/e2e
npm install
npx playwright install chromium
npm run flows
npm run diff
```

Al migrar el HTML, mantén los `id` que usa el arnés (los mismos que usa la lógica):
- `#quoteForm [data-via]`, `#gate`, `#cuentaAviso`, `#calc`, `#rec`, `#usarRec`, `#abrirAsistente`;
- `#fLogin`, `#fRegistro`, `#lista .order`, `#dlg`, `#dCerrar`, `#salir`, `#linkPanel`;
- `#tbody tr[data-id]`, `#fEdit`, `#eStatus`, `#eMsgOut`, `[data-tab]`, `#cL`… `#cRes`, `#pegar`, `#leer`, `#cExtra`, `#tbodyCli`.

Además, actualiza dos selectores en `flows.js`:
- `#calc` ahora usa `notice--success` / `notice--warning` en vez de `ok` / `warn`;
- `#cRes .status-line` pasa a ser `#cRes .notice`.

## Pendiente de revisar

- Ejecuta `/code-review` sobre el diff completo cuando estén las tres páginas.
- Lanza un revisor de estética independiente sobre las capturas.
- Actualiza `README.md`: los datos del negocio ahora están en `assets/config.js`.
