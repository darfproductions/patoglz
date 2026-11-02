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

## Archivos
| Archivo | Para qué |
|---|---|
| `index.html` | Página pública con cotizador y asistente de resistencia |
| `cuenta.html` | Inicio de sesión / registro de clientes y **Mis pedidos** (estado e historial) |
| `panel.html` | **Panel staff**: pedidos, cambio de estado, precio, entrega, notas internas, clientes y calculadora de lámina |
| `assets/config.js` | URL y llave pública de Supabase |
| `assets/app.js`, `assets/app.css` | Código y estilos compartidos de cuenta y panel |
| `supabase/schema.sql` | Base de datos: tablas, reglas de seguridad (RLS) y staff |

## Conectar el inicio de sesión (Supabase)
1. Crea un proyecto en supabase.com (plan gratuito).
2. En **SQL Editor** pega y ejecuta todo `supabase/schema.sql`.
3. En **Project Settings → API** copia la *Project URL* y la *publishable/anon key* en `assets/config.js`.
4. En **Authentication → URL Configuration** pon la dirección de la página publicada.
5. Los correos de `staff_emails` (pgonzalezcastro1@gmail.com y jlcastro48@yahoo.com) quedan como **staff** al crear su cuenta en `cuenta.html`.
   Para agregar otro: `insert into staff_emails values ('correo@ejemplo.com');` (antes de que se registre)
   o `update profiles set role = 'staff' where email = 'correo@ejemplo.com';`

Estados de pedido: Cotización solicitada → Cotizado → Confirmado → En producción → En camino → Entregado (o Cancelado).
El cliente solo ve sus pedidos, sin notas internas ni m²; puede cancelar mientras esté en cotización.

Si cambias la fórmula de lámina o el mínimo, actualízalos en `index.html` y `assets/app.js`.
