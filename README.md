# Gloria Curiel — Cajas de cartón corrugado

Página web de una sola página (sin servidor) para Gloria Curiel: venta de cajas de cartón corrugado en CDMX y Estado de México.

## Cómo verla
Abre `index.html` en cualquier navegador.

## Cómo editar datos del negocio
Al final de `index.html`, en la sección `CONFIGURACIÓN DEL NEGOCIO`:
- `WHATSAPP`: número con lada de país (52 + 10 dígitos)
- `EMAILS`: correos que reciben las cotizaciones
- `MINIMO_M2`: pedido mínimo en m² de cartón

## Publicar gratis
- **Vercel**: importar este repositorio en vercel.com → Deploy.
- **GitHub Pages**: Settings → Pages → rama principal, carpeta raíz.

## Calculadora interna (`calculadora.html`)
Página privada para el negocio (no está enlazada desde la página ni se indexa en Google).
Pega el mensaje de cotización del cliente y muestra la medida de lámina regular, m² por caja,
m² totales y si cumple el pedido mínimo. Al cliente solo se le muestra si cumple el mínimo.

Si cambias la fórmula o el mínimo, actualízalos en **ambos** archivos (`index.html` y `calculadora.html`).
