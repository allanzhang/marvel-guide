// 从 dist/ 扫描所有 HTML 生成 sitemap.xml（构建后运行）
import { readdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.env.SITE_URL || 'https://example.com';
const DIST = `${process.cwd()}/dist`;
const urls = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!name.endsWith('.html')) continue;
    // 相对 dist 的路径：index.html → /，characters/tony-stark/index.html → /characters/tony-stark/
    let rel = full.slice(DIST.length).replace(/\/index\.html$/, '/');
    if (rel === '/index.html') rel = '/';
    if (rel.startsWith('/posters/') || rel.startsWith('/portraits/')) continue;
    urls.push(rel);
  }
}
walk(DIST);
urls.sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync(`${process.cwd()}/dist/sitemap.xml`, xml);
console.log(`sitemap.xml 已生成（dist/）：${urls.length} 个 URL`);
