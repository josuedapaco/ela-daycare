import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// URL final del sitio en producción — cambia si usan otro dominio
const SITE = process.env.PUBLIC_SITE_URL || 'https://eladaycare.com';

export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [
    sitemap({
      // Una sola página: conviene decirle a Google que es la principal y que
      // los cupos se revisan cada semana.
      changefreq: 'weekly',
      priority: 1,
      lastmod: new Date(),
      filter: (page) => !page.includes('/panel'),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
  },
  compressHTML: true,
});
