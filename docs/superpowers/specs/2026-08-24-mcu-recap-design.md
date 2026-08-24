# MCU 主线复盘页设计

## 目标

新增 `/recap` 页面，服务“已经看过大部分 MCU 电影和剧集，但剧情、人物、事件与概念串不起来”的用户。页面以完整深度版长文形式，按五大篇章和跨作品大事件组织剧情骨架，帮助用户复习主线，并通过人物、概念、作品链接完成查漏补缺。

## 范围

- 新增独立主线复盘页 `/recap`。
- 新增 `content/recap.json` 管理复盘内容。
- 拆分 Astro 组件，避免时间线页继续膨胀。
- 新增复盘数据校验，并接入现有 `npm run validate`。
- 在全站导航中加入“主线复盘”。
- 保持纯静态、零客户端 JS；折叠使用原生 `<details>`。
- 不重构现有时间线、作品、人物、概念页面。

## 页面边界

- `/timeline` 保持为按剧情时序浏览作品的索引。
- `/recap` 负责跨作品的大事件因果复盘。
- `/works/[id]` 负责单部作品完整剧情、剧照、影评和观看决策。
- `/characters/[id]` 和 `/concepts/[id]` 承接查漏补缺；本次只做从复盘页到它们的链接，不重做详情页。

## 信息架构

页面结构：

1. 开篇说明：适合谁、如何阅读、剧透提示。
2. 目录：五大篇章与大事件锚点。
3. 五大篇章：每个篇章含标题、摘要和多个大事件。
4. 每个大事件含：一句话结论、事件时间说明、正文、关键转折、人物变化、概念与伏笔、相关作品、延伸线索。
5. 结尾索引：引导到人物墙、概念库和时间线。

## 大事件划分

第一版包含 24 个事件：

1. 宇宙魔方、超级士兵与美国队长诞生
2. 惊奇队长与复仇者倡议的源头
3. 钢铁侠登场与现代超级英雄时代开启
4. 雷神、洛基与纽约大战
5. 现实宝石、银河护卫队与灭霸暗线
6. 神盾局崩塌与冬兵曝光
7. 奥创纪元、幻视诞生与分裂伏笔
8. 皮姆粒子与量子领域入口
9. 索科维亚协议与复仇者内战
10. 新英雄接入与战后格局
11. 魔法体系与多元宇宙第一道裂缝
12. 阿斯加德覆灭与无限战争前奏
13. 灭霸集齐无限宝石
14. 量子领域、时间劫案与终局反击
15. 响指之后的身份与信任危机
16. TVA、神圣时间线与洛基的选择
17. 西景镇、绯红女巫与黑暗神书
18. 蜘蛛侠身份危机与宇宙碰撞
19. 多元宇宙、光照会与绯红女巫黑化
20. 康议会与量子领域重启
21. 宇宙势力与家族创伤线
22. 地球地下战争与新世界秩序
23. Fox 宇宙并入与死侍跨界
24. 毁灭日与秘密战争的战场形成

## 内容模型

`content/recap.json` 顶层结构：

```json
{
  "version": 1,
  "intro": {
    "title": "主线复盘",
    "audience": "...",
    "spoilerNotice": "...",
    "howToRead": ["..."]
  },
  "eras": [
    {
      "eraId": "era-ww2",
      "title": "...",
      "summary": "...",
      "events": [
        {
          "id": "recap-...",
          "title": "...",
          "status": "core",
          "oneLine": "...",
          "timelineNote": "...",
          "body": ["..."],
          "turningPoints": ["..."],
          "characterChanges": [{ "id": "steve-rogers", "summary": "..." }],
          "conceptThreads": [{ "id": "tesseract", "summary": "..." }],
          "relatedWorks": { "core": ["..."], "supplementary": ["..."] },
          "extendedNotes": [{ "title": "...", "body": ["..."] }],
          "knownThreads": ["..."],
          "openQuestions": ["..."]
        }
      ]
    }
  ]
}
```

`status` 枚举：

- `core`：核心主线。
- `supplementary`：补充理解。
- `setup`：伏笔/铺垫。
- `upcoming`：未上映前瞻。

`upcoming` 事件只能整理已知线索和待确认问题，不能把推测写成已发生剧情。

## 技术设计

新增文件：

- `content/recap.json`
- `src/pages/recap.astro`
- `src/components/recap/RecapIntro.astro`
- `src/components/recap/RecapToc.astro`
- `src/components/recap/RecapEra.astro`
- `src/components/recap/RecapEvent.astro`
- `src/components/recap/RecapRelatedLinks.astro`

修改文件：

- `src/lib/data.mjs`：导出 `recap`、`recapStatusMeta` 和相关 lookup helper。
- `src/layouts/Base.astro`：导航增加“主线复盘”。
- `src/styles/global.css`：增加复盘页样式。
- `scripts/validate-content.mjs`：校验 recap 数据和引用完整性。

组件职责：

- `recap.astro`：读取数据并组装页面。
- `RecapIntro.astro`：呈现定位、剧透提示、读法。
- `RecapToc.astro`：呈现篇章和事件目录。
- `RecapEra.astro`：呈现篇章头部。
- `RecapEvent.astro`：呈现单个事件。
- `RecapRelatedLinks.astro`：呈现人物、概念、作品链接。

## 错误处理与校验

`npm run validate` 必须检查：

- recap 版本和 intro 存在。
- era 引用存在。
- event id 唯一。
- status 合法。
- 必填字段存在：title、oneLine、body、turningPoints。
- body 至少一段，turningPoints 至少一条。
- 人物、概念、作品引用存在。
- relatedWorks 数组合法且不重复。
- extendedNotes 的 title/body 合法。
- upcoming 事件必须包含 knownThreads 和 openQuestions。
- 不允许 TODO/TBD/待补充等占位文本。

渲染时若引用不存在，应由 helper 抛出明确错误，避免生成空链接。

## 测试与验收

- 先扩展校验脚本并确认缺少 recap 时失败。
- 写入 recap 数据后运行 `npm run validate`。
- 运行 `npm run build`，确认 Astro 构建和 sitemap 成功。
- 手动检查 `/recap`：导航、锚点、相关链接、details 折叠、移动端宽度。
