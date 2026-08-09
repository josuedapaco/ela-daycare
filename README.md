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

## Cómo subirlo a tu servidor

Sube el contenido de esta carpeta (no la carpeta en sí) a la raíz pública de tu hosting:

- **cPanel / hosting tradicional:** sube todo dentro de `public_html/` (o `public_html/eladaycare/` si va en una subcarpeta).
- **Netlify / Vercel:** arrastra esta carpeta completa a su panel de "deploy manual", o conéctala a un repositorio Git.
- **FTP/SFTP:** conserva la misma estructura de carpetas (`css/`, `js/`, `img/` deben quedar junto a `index.html`).

No hay build ni dependencias — es HTML/CSS/JS puro, funciona con solo subir los archivos.

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
