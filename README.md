# 漫威电影世界图鉴

面向非漫威迷的 MCU 剧情时序图鉴——顺着读就能看懂整个漫威电影世界。

纯静态网站，零 JS 交互，宽屏震撼排版，以大幅海报 + 大字号 + 大留白取胜。

## 项目定位

- **目标用户**：非漫威迷观众
- **核心价值**：解决"看不懂漫威谁是谁、什么先什么后"的痛点
- **三大页面**：时间线（剧情时序主轴）、人物墙（角色深度）、人物详情（三段式）
- **内容范围**：MCU 正史为主，跨宇宙人物出现时解释串联

## 技术栈

- **Astro 5** — 纯静态生成，零客户端 JS
- **原生 CSS** — 设计令牌 + 单文件样式，无框架
- **JSON 数据源** — content/ 下三个集合，id 互链

## 本地开发

```bash
npm install
npm run dev      # 本地预览
npm run build    # 构建到 dist/
npm run validate # 数据引用完整性校验
npm run preview  # 预览构建产物
```

## 如何添加内容

所有内容都在 `content/` 目录的三个 JSON 文件中，改完执行 `npm run validate` 校验引用完整性，再 `npm run build`。

- `eras.json` — 时代篇章（主题色、导读、年份范围）
- `movies.json` — 电影（剧情年份、梗概、关联人物、跨宇宙注解）
- `characters.json` — 人物（三段式文案、分组、关联电影）

> 注意：JSON 内文案中的引号请使用中文弯引号「"」而非 ASCII 直引号「"」，否则会破坏 JSON 结构。

## 内容分期

- **M1（已完成）**：无限传奇全量（4 篇章 / 24 部电影 / 37 个人物）
- **M2**：补全多元宇宙（Phase 4-6 全量 + 跨宇宙串联注解）
- **M3**：最新作品持续收录 + 排版精修

## 如何替换真实海报

当前为占位 SVG（时代主题色 + 大字排版）。接入真实海报时，用同名文件替换即可，代码零改动：

- 电影海报 → `public/posters/poster-<movieId>.svg`（竖版 3:4.4）
- 人物肖像 → `public/portraits/portrait-<charId>.svg`（竖版 3:3.6）

重新生成占位图：`node scripts/gen-placeholders.mjs`

## 部署

静态产物在 `dist/`，可直接部署到 Vercel / Cloudflare Pages / 任意静态托管。
