import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// URL final del sitio en producción — cambia si usan otro dominio
const SITE = process.env.PUBLIC_SITE_URL || 'https://eladaycare.com';

export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
    assets: 'assets',
  },
  compressHTML: true,
});
