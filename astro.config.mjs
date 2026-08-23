import { defineConfig } from 'astro/config';

// 部署域名：本地默认 example.com，GitHub Actions 注入真实域名
const SITE = process.env.SITE_URL || 'https://example.com';
// 子路径部署：GitHub Pages 项目站点需要 base（如 /marvel-guide/），本地/根域为 /
const BASE = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  compressHTML: true
});
