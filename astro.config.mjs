import { defineConfig } from 'astro/config';

// 部署域名：本地默认 example.com，GitHub Actions 注入真实域名
const SITE = process.env.SITE_URL || 'https://example.com';

export default defineConfig({
  site: SITE,
  compressHTML: true
});
