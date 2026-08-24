# 漫威电影世界图鉴

面向非漫威迷的 MCU 剧情时序图鉴——顺着读就能看懂整个漫威电影世界。

**在线访问：https://allanzhang.github.io/marvel-guide/**

纯静态网站，零 JS 交互，宽屏震撼排版（1440px 大留白 + 大幅海报），所有图片为 TMDB 官方资源（WebP 格式）。每部作品拥有独立详情页，含完整剧情、剧照画廊、出场人物、经典台词和精选影评。

## 项目定位

- **目标用户**：非漫威迷观众
- **核心价值**：解决「看不懂漫威谁是谁、什么先什么后」的痛点
- **收录原则**：判断一部作品是否收录，唯一标准是「观众是否能借此理解背景信息、人物关系、时间线」，不按正史/非正史设硬性分组
- **内容范围**：MCU 全量电影 + 重要剧集（与电影同级别入主线时间线），跨宇宙人物出现时解释串联

## 内容体系（四大维度，全站互链）

| 维度 | 页面 | 说明 |
|------|------|------|
| 时间线 | `/timeline` | 5 篇章 × 56 部作品按剧情时序混排（电影+剧集同级）；剧集带「观众须知」三段（背景/人物关系/时间线衔接）；篇章头图用 TMDB 宽屏剧照 |
| 作品详情 | `/works/[id]` | 56 个独立页面，含全宽海报 Banner、观看决策（必看/推荐/可选 + 跳过影响）、完整剧情、不对称剧照宫格、出场人物卡、经典台词、精选影评（中文优先） |
| 人物墙 | `/characters` | 71 位英雄/反派/配角，三段式文案（他是谁/他的作用/他的故事线）|
| 概念库 | `/concepts` | 42 个设定词条（无限宝石/魔法体系/组织/种族/事件），每词条含定义/来源/出现作品/相关互链 |
| 中英对照 | 全站正文 | 名词统一「中文（English）」标注；正文概念词自动链接概念库 |

时间线、人物页、概念页均直达作品详情页；作品详情页回链人物与时间线，形成「作品 ↔ 人物 ↔ 概念」双向闭环。

### 观看决策系统

每部作品标注三级观看优先级：

- **必看** — 跳过会影响后续主线理解
- **推荐观看** — 显著提升体验，但可跳过
- **可以跳过** — 补充型内容，不影响主线

每部作品附「如果跳过」一句话说明，每个篇章有「本篇核心任务」导读，帮助非漫威迷快速判断看什么、怎么看。

## 数据规模

- 5 篇章（远古与二战 → 多元宇宙时代）
- 40 部电影 + 16 部剧集（Phase 4-6 全量，含跨宇宙注解）
- 71 位人物（含出演剧集关联）
- 42 个概念词条
- 56 部作品的完整剧情、220 张剧照、精选影评（含中文影评）
- 173 个静态页面 + sitemap

## 技术栈

- **Astro 5** — 纯静态生成，零客户端 JS
- **原生 CSS** — 设计令牌 + 页面级样式，无框架
- **JSON 数据源** — `content/` 下四个集合，id 互相引用，构建时自动生成链接
- **TMDB API** — 海报/肖像/剧照全部为官方资源（拉取脚本见 `scripts/`）

## 本地开发

```bash
npm install
npm run dev      # 本地预览
npm run build    # 构建到 dist/（含 sitemap 生成）
npm run validate # 数据引用完整性校验（唯一性/必填/双向链接）
npm run preview  # 预览构建产物
```

## 如何添加内容

所有内容在 `content/` 目录的四个 JSON 文件中，改完依次执行：

```bash
npm run validate   # 校验引用完整性（作品↔人物↔概念双向链接必查）
node scripts/annotate-terms.mjs  # 名词中英对照标注（幂等）
npm run build      # 构建
```

- `eras.json` — 时代篇章（主题色、头图剧照、导读、核心任务 coreGoal）
- `movies.json` — 电影（剧情年份、梗概、完整剧情 overview、观看优先级 watchPriority、跳过影响 skipImpact、剧照 stills、影评 reviews、关联人物、跨宇宙注解、台词）
- `series.json` — 剧集（含「观众须知」三段：backgroundNote/relationsNote/timelineNote，其余字段同电影）
- `characters.json` — 人物（三段式文案、分组、关联作品）
- `concepts.json` — 概念词条（定义、来源、出现作品、相关概念/人物）

> 注意：JSON 内文案中的引号请使用中文弯引号「」而非 ASCII 直引号「"」，否则会破坏 JSON 结构。

## 图片维护

图片全部为 TMDB 官方 WebP（本地存放，构建时复制到 dist）：

- 作品海报 → `public/posters/poster-<id>.webp`（56 张）
- 人物肖像 → `public/portraits/portrait-<id>.webp`（71 张）
- 篇章/概念剧照 → `public/backdrops/*.webp`（47 张）
- 作品剧照 → `public/stills/still-<id>-<n>.webp`（220 张，每部 3–4 张）

新增内容后可用拉取脚本自动补图（需 `.env.local` 配置 TMDB_API_KEY）：

```bash
node scripts/fetch-tmdb-images.mjs      # 拉取海报（电影/剧集）
node scripts/fetch-tmdb-portraits.mjs   # 拉取人物肖像
node scripts/fetch-tmdb-backdrops.mjs   # 拉取章节/概念剧照
node scripts/fetch-tmdb-work-detail.mjs # 拉取作品剧照、完整剧情（overview）、TMDB ID
node scripts/fetch-tmdb-work-reviews.mjs # 拉取精选影评（中文优先，英文回退）
```

## 部署

GitHub Actions 自动部署：**每次 push main** → Astro 构建 → GitHub Pages 发布。

- 线上地址：https://allanzhang.github.io/marvel-guide/
- 仓库：https://github.com/allanzhang/marvel-guide
- 部署配置：`.github/workflows/deploy.yml`（构建时注入 SITE_URL / BASE_PATH 环境变量）

## 内容分期

- **M1（已完成）**：无限传奇全量（4 篇章 / 24 部电影 / 37 个人物）
- **M2（已完成）**：多元宇宙时代（Phase 4-6 电影 + 剧集入主线 + 概念库 + 工程打磨 + TMDB 真实图片）
- **M3（已完成）**：作品详情页（剧照/完整剧情/影评）、观看决策系统、全量人物补齐（71 位）、全站双向链接
- **M4（待做）**：移动端真机复测 / Phase 6 未上映作品上映后补全（毁灭日 2026-12、秘密战争 2027）

## 免责声明

内容整理自公开资料（TMDB / 豆瓣 / 时光网），仅供学习参考，非商用。漫威（Marvel）相关版权归漫威影业所有。
