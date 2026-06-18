import fs from 'fs';
import path from 'path';

// Parse contentRegistry.ts directly to avoid TS module import issues in node
const contentRegistrySource = fs.readFileSync(path.resolve(process.cwd(), 'src/data/contentRegistry.ts'), 'utf-8');

const publicDir = path.resolve(process.cwd(), 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

const BASE_URL = process.env.VITE_DOMAIN || 'https://qrcraftly.com';

// Extract keys which represent the paths
const pageIds = [];
const regex = /"([^"]+)":\s*\{\s*"id"/g;
let match;
while ((match = regex.exec(contentRegistrySource)) !== null) {
  pageIds.push(match[1]);
}

const generateSitemap = () => {
  const pages = pageIds.map(id => {
    let urlPath = id === 'index' ? '/' : `/${id}/`;
    let priority = id === 'index' ? 1.0 : 0.8;
    let changefreq = id === 'index' ? 'weekly' : 'monthly';
    
    return {
      url: urlPath,
      changefreq,
      priority
    };
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  fs.writeFileSync(sitemapPath, sitemapContent, 'utf-8');
  console.log('Sitemap generated successfully with trailing slashes from registry.');
};

generateSitemap();
