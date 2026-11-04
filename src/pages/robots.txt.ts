import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? 'https://eladaycare.com');
  return new Response(`User-agent: *
Allow: /
Disallow: /panel
Disallow: /admin.html
Disallow: /api/

Sitemap: ${sitemap}
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
