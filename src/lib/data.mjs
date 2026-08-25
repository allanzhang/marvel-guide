// 共享数据加载：所有页面统一从这里读取 JSON，避免路径不一致
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(`${process.cwd()}/content/${p}`, 'utf8'));

export const eras = read('eras.json');
export const movies = read('movies.json');
export const series = read('series.json');
export const characters = read('characters.json');
export const concepts = read('concepts.json');
export const recap = read('recap.json');
export const faq = read('faq.json');

export const charById = Object.fromEntries(characters.map((c) => [c.id, c]));
export const eraById = Object.fromEntries(eras.map((e) => [e.id, e]));
export const conceptById = Object.fromEntries(concepts.map((c) => [c.id, c]));
export const workById = Object.fromEntries([...movies, ...series].map((w) => [w.id, w]));

// 概念分类定义（概念库用）
export const conceptOrder = [
  ['gem', '无限宝石', 'The Infinity Stones'],
  ['item', '力量与物品', 'Power & Artifacts'],
  ['magic', '魔法体系', 'The Mystic Arts'],
  ['org', '组织与势力', 'Organizations'],
  ['place', '地点与领域', 'Places & Realms'],
  ['concept', '概念与事件', 'Concepts & Events'],
];

export const recapStatusMeta = {
  core: { label: '核心主线', en: 'Core Arc' },
  supplementary: { label: '补充理解', en: 'Context' },
  setup: { label: '伏笔/铺垫', en: 'Setup' },
  upcoming: { label: '未上映前瞻', en: 'Upcoming' },
};

export const sortedEras = [...eras].sort((a, b) => a.startYear - b.startYear);
export const sortedMovies = [...movies].sort((a, b) => a.year - b.year || (a.order || 0) - (b.order || 0));
export const sortedSeries = [...series].sort((a, b) => a.year - b.year || (a.order || 0) - (b.order || 0));
// 电影+剧集合并按剧情时序（同一年份电影优先，order 次之）
export const sortedEntries = [...movies, ...series].sort(
  (a, b) => a.year - b.year || (a.order || 0) - (b.order || 0)
);
export const isSeries = (item) => item.type === 'series';

const BASE = import.meta.env.BASE_URL || '/';
export const posterUrl = (id) => `${BASE}posters/poster-${id}.webp`;
export const portraitUrl = (id) => `${BASE}portraits/portrait-${id}.webp`;
export const backdropUrl = (name) => `${BASE}backdrops/${name}.webp`;
// 大事件条目的横版剧照（仅大事件作品已拉取）
export const workBackdropUrl = (id) => `${BASE}backdrops/work-${id}.webp`;
// 页面链接 helper（加 base 前缀）
export const pageUrl = (path) => `${BASE}${path.replace(/^\//, '')}`;

// 正文词链接：把「概念中文名」与「角色名/名号」替换为指向对应页面的链接。
// 规则：长词优先；概念词优先于角色词（同名时指向概念页）；已带链接的不重复。
const zhPart = (s) => (s || '').replace(/（.*$/, '').trim();
// 提取全角括号内的英文注音（用于给链接补上统一的中文（English）样式）
const enPart = (s) => {
  const m = /（([A-Za-z][^（）]*)）/.exec(s || '');
  return m ? m[1] : '';
};

// 干净名号：形如「中文（English）」且括号后无其他描述（排除「神盾局（S.H.I.E.L.D.）局长」这类含概念词的描述性角色）
const isCleanAlias = (s) => /^[^（）]*（[^（）]*）$/.test((s || '').trim());

const conceptTerms = concepts
  .map((c) => ({ zh: zhPart(c.name), en: enPart(c.name), href: pageUrl(`concepts/${c.id}`) }))
  .filter((x) => x.zh.length >= 2);

const charTerms = characters
  .flatMap((c) => {
    const terms = [];
    const name = zhPart(c.name);
    const alias = zhPart(c.alias);
    if (name.length >= 2) terms.push({ zh: name, en: enPart(c.name), href: pageUrl(`characters/${c.id}`) });
    // 仅收录「干净名号」，避免把「九头蛇首领」「神盾局局长」这类描述误判为角色
    if (isCleanAlias(c.alias) && alias.length >= 2) terms.push({ zh: alias, en: enPart(c.alias), href: pageUrl(`characters/${c.id}`) });
    return terms;
  });

// 合并：概念词优先（同名冲突时指向概念页），再按中文长度降序，保证长词优先匹配
const linkTerms = (() => {
  const byZh = new Map();
  for (const t of charTerms) if (!byZh.has(t.zh)) byZh.set(t.zh, t);
  for (const t of conceptTerms) byZh.set(t.zh, t); // 概念覆盖同名角色
  return [...byZh.values()].sort((a, b) => b.zh.length - a.zh.length);
})();

// 正文中的《作品名》链接到作品页。这里只匹配书名号内的完整作品名，
// 避免把无书名号的角色词（如“惊奇队长”）误链到电影。
const workTitleMap = new Map();
{
  const shortTitleCounts = new Map();
  for (const w of Object.values(workById)) {
    const zh = zhPart(w.title);
    const short = zh.split(/[：:]/)[0];
    // 同一部作品的全名和短名相同只计一次；这里统计的是“这个短名是否跨作品重名”。
    const candidates = new Set([zh, short]);
    for (const candidate of candidates) {
      shortTitleCounts.set(candidate, (shortTitleCounts.get(candidate) || 0) + 1);
    }
  }
  const firstWorkAliases = {
    'captain-america-first-avenger': ['美国队长1'],
    'thor-1': ['雷神1'],
    'avengers-1': ['复仇者联盟1'],
    'ant-man-1': ['蚁人1'],
    'guardians-1': ['银河护卫队1'],
    'spider-man-homecoming': ['蜘蛛侠1'],
    'black-panther-1': ['黑豹1'],
    'doctor-strange-1': ['奇异博士1'],
    'iron-man-1': ['钢铁侠1'],
    'fantastic-four-1': ['神奇四侠1']
  };
  for (const [id, aliases] of Object.entries(firstWorkAliases)) {
    for (const alias of aliases) workTitleMap.set(alias, pageUrl(`works/${id}`));
  }
  for (const w of Object.values(workById)) {
    const zh = zhPart(w.title);
    const short = zh.split(/[：:]/)[0];
    workTitleMap.set(zh, pageUrl(`works/${w.id}`));
    if (short !== zh && shortTitleCounts.get(short) === 1) {
      workTitleMap.set(short, pageUrl(`works/${w.id}`));
    }
  }
}
function linkWorks(text) {
  return text.replace(/《([^》]+)》/g, (matched, title) => (
    workTitleMap.has(title) ? `<a class="c-link" href="${workTitleMap.get(title)}">${matched}</a>` : matched
  ));
}

export function linkConcepts(text) {
  if (!text) return text;
  text = linkWorks(text);
  // 单遍扫描：在每一处只取「当前位置命中且最长的词」，连同其括号英文一起吞掉并前进。
  // 这样绝不会在已生成的锚点内部二次匹配，可避免「雷神之锤」被拆成「雷神」+「之锤」。
  // linkTerms 已按中文长度降序，故首个 startsWith 命中即是最长词。
  let out = '';
  let i = 0;
  outer: while (i < text.length) {
    // 跳过已生成的 HTML 锚点（含其内部文本），避免《作品名》链接又被角色/概念词二次套链接。
    if (text.startsWith('<a ', i)) {
      const close = text.indexOf('</a>', i);
      if (close !== -1) {
        out += text.slice(i, close + 4);
        i = close + 4;
        continue;
      }
    }
    if (text[i] === '<') {
      const close = text.indexOf('>', i);
      if (close === -1) {
        out += text.slice(i);
        break;
      }
      out += text.slice(i, close + 1);
      i = close + 1;
      continue;
    }
    for (const { zh, en, href } of linkTerms) {
      if (!text.startsWith(zh, i)) continue;
      // 尝试吞掉紧邻的括号英文（形式与数据一致：全角括号 + 拉丁开头）
      let end = i + zh.length;
      const m = /^（[A-Za-z][^）]*）/.exec(text.slice(end));
      if (m) end += m[0].length;
      // 术语（含紧邻英文注音）后紧跟 ASCII 数字/字母：视为更长专名的一部分
      // （如作品续集名「惊奇队长2」「雷神（Thor）2」「美国队长（Captain America）4」）。
      // 此处不切割，避免把续集名拆成「角色名+数字」。直接放弃本位置的链接
      // （较短的候选词同样属于该专名内部），回落到逐字输出。
      const next = text[end];
      if (next && /[0-9A-Za-z]/.test(next)) break;
      // 优先用词条自带英文注音，保证全站链接统一为「中文（English）」；
      // 词条无英文时回退到原文紧邻的括号英文。
      // 统一为「（English）」形式，与卡片/标题里 softenText 生成的注音一致。
      // en 为纯英文需补全角括号；m[0] 已含括号则直接复用。
      const enText = en ? `（${en}）` : (m && m[0]) || '';
      const enSpan = enText ? `<span class="c-en">${enText}</span>` : '';
      out += `<a class="c-link" href="${href}">${zh}${enSpan}</a>`;
      i = end;
      continue outer;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

// 括号英文弱化：把正文/标题里的「（English）」或「(English)」包成辅助注音，
// 让中文成为阅读主线（与概念库 c-en 风格一致）。已包裹的 c-en 跳过，避免二次嵌套。
function softenParens(html) {
  if (!html) return html;
  const saved = [];
  let out = html.replace(/<span class="c-en">([^<]*)<\/span>/g, (m) => {
    saved.push(m);
    return `\u0003${saved.length - 1}\u0004`;
  });
  out = out.replace(/([（(])([A-Za-z][A-Za-z0-9 ,.'&:;·\-/]*?)([）)])/g, (_m, open, inner, close) => {
    return `<span class="c-en">${open}${inner}${close}</span>`;
  });
  out = out.replace(/\u0003(\d+)\u0004/g, (_m, n) => saved[Number(n)]);
  return out;
}

// 正文富文本：先做概念链接，再弱化剩余括号英文
export function enrichText(text) {
  return softenParens(linkConcepts(text));
}

// 纯文本（如标题）：先转义 HTML 特殊字符，再弱化括号英文（不做概念链接）
export function softenText(text) {
  if (!text) return text;
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return softenParens(escaped);
}

// 去掉「观众须知」条目正文开头的冗余标签前缀（框内已有加粗标签 + 框标题）
export function cleanNote(text) {
  if (!text) return text;
  return text.replace(/^(观众须知·背景|人物关系|时间线衔接)[：:]\s*/, '');
}

// 人物分组顺序定义（人物墙用）
export const groupOrder = [
  ['avengers-core', '复仇者核心', 'The Avengers'],
  ['solo', '独行英雄', 'Solo Heroes'],
  ['guardians', '银河护卫队', 'Guardians of the Galaxy'],
  ['mystic', '神域与魔法', 'Mystic Arts'],
  ['villains', '反派堂', 'Villains'],
  ['support', '重要配角', 'Key Support'],
];
