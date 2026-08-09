# ELA Daycare — sitio listo para hosting

Estructura de carpetas separada (HTML / CSS / JS / imágenes), lista para subir a cualquier servidor o hosting estático (cPanel, cualquier plan compartido, Netlify, Vercel, GitHub Pages, etc.).

## Estructura

```
DAY CARE/
├── index.html          → página principal (única página)
├── favicon.svg          → ícono de pestaña (el logo "ELA")
├── css/
│   └── style.css        → todos los estilos
├── js/
│   └── main.js           → interactividad (idioma ES/EN, pestañas, menú, modo revisión)
└── img/
    ├── hero/             → foto de la sala principal (hero)
    ├── grupos/           → fotos de cada grupo de edad (bebés, caminadores, angelitos, después de escuela)
    ├── dia/               → foto del almuerzo / un día cualquiera
    ├── equipo/            → fotos de la dueña, la asistente y la casa
    └── lugar/             → foto de la fachada o mapa (sección de inscripción)
```

Las carpetas de `img/` están vacías (con un `.gitkeep` para que no se pierdan al subirlas). El diseño actual usa recuadros de "Foto: ..." como marcador visual — apenas tengas las fotos reales, colócalas en la carpeta correspondiente y cambia ese `<div class="ph">...</div>` por una etiqueta `<img src="img/carpeta/archivo.jpg" alt="...">` dentro de cada `.frame`.

## Cómo se despliega (VPS Hostinger + EasyPanel)

El repositorio vive en GitHub: **https://github.com/josuedapaco/ela-daycare** (privado). El sitio se sirve con el `Dockerfile` de la raíz (nginx sirviendo los archivos estáticos, sin build ni dependencias).

1. En **EasyPanel** crea un nuevo servicio tipo **App**, con fuente **GitHub** → conecta la cuenta si no lo está → selecciona el repo `ela-daycare`, rama `main`.
2. Método de build: **Dockerfile** (ya está en la raíz del repo, no hay que tocar nada).
3. Activa **Auto Deploy / Deploy on push** para que cada `git push` a `main` reconstruya y publique el sitio solo.
4. Puerto del contenedor: **80** (nginx).
5. Agrega el dominio (comprado en Namecheap) en la sección **Domains** del servicio dentro de EasyPanel — EasyPanel emite el certificado SSL automáticamente vía Traefik/Let's Encrypt en cuanto el DNS apunte correctamente.

### DNS en Namecheap

En Namecheap → **Domain List → Manage → Advanced DNS**, agrega:

- Un registro **A** con host `@` apuntando a la **IP pública del VPS de Hostinger**.
- Un registro **A** (o **CNAME** a `@`) con host `www` apuntando a la misma IP, si quieres que `www.tudominio.com` también funcione.

La propagación puede tardar desde minutos hasta unas horas.

## Datos que todavía faltan por confirmar

El sitio ya tiene un botón **"Qué falta llenar"** en la barra superior (izquierda del selector de idioma). Al activarlo, resalta en amarillo cada dato de ejemplo que hay que reemplazar antes de publicar de verdad: teléfono, número de licencia OCFS, dirección, nombre de la dueña, precios, testimonios, estadística de años operando, etc.

Puntos principales pendientes:
- Teléfono real (ahora `(718) 555-0142`, es un número de ejemplo)
- Número de licencia OCFS de NY (ahora `000000`)
- Dirección completa de la casa
- Nombre de la dueña y de la asistente, y sus fotos
- Confirmar los precios publicados en la sección "Precios"
- Reemplazar los 3 testimonios de ejemplo por reseñas reales de Google
- Fotos reales en cada carpeta de `img/` (ver arriba)
- Correo `hola@eladaycare.com` — confirmar si es el real
