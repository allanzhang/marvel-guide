// 共享数据加载：所有页面统一从这里读取 JSON，避免路径不一致
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(`${process.cwd()}/content/${p}`, 'utf8'));

export const eras = read('eras.json');
export const movies = read('movies.json');
export const series = read('series.json');
export const characters = read('characters.json');
export const concepts = read('concepts.json');

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

export const sortedEras = [...eras].sort((a, b) => a.startYear - b.startYear);
export const sortedMovies = [...movies].sort((a, b) => a.year - b.year || (a.order || 0) - (b.order || 0));
export const sortedSeries = [...series].sort((a, b) => a.year - b.year || (a.order || 0) - (b.order || 0));
// 电影+剧集合并按剧情时序（同一年份电影优先，order 次之）
export const sortedEntries = [...movies, ...series].sort(
  (a, b) => a.year - b.year || (a.order || 0) - (b.order || 0)
);
export const isSeries = (item) => item.type === 'series';

export const posterUrl = (id) => `/posters/poster-${id}.webp`;
export const portraitUrl = (id) => `/portraits/portrait-${id}.webp`;
export const backdropUrl = (name) => `/backdrops/${name}.webp`;
// 大事件条目的横版剧照（仅大事件作品已拉取）
export const workBackdropUrl = (id) => `/backdrops/work-${id}.webp`;

// 概念词链接：把正文中的「概念中文名（English）」替换为指向概念库的链接
// 规则：长词优先；仅匹配概念名（人物名由 chip 处理）；已带链接的不重复
const conceptLinks = concepts
  .map((c) => {
    const zh = c.name.replace(/（.*$/, '').trim();
    return { zh, en: c.name, href: `/concepts/${c.id}` };
  })
  .filter((x) => x.zh.length >= 2)
  .sort((a, b) => b.zh.length - a.zh.length);

export function linkConcepts(text) {
  if (!text) return text;
  let out = text;
  // 单趟扫描：从左到右找最长概念词匹配，输出时包链接
  // 用分隔符 \u0001 \u0002 标记已替换段，防止二次命中
  for (const { zh, en, href } of conceptLinks) {
    const esc = zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 匹配「中文（English）」或「中文」，但排除已被 \u0001 包裹的段落
    const re = new RegExp(`(?<![\\u0001a-zA-Z0-9])${esc}(（[A-Za-z][^）]*）)?(?![\\u0002])`, 'g');
    out = out.replace(re, (m) => `\u0001<a class="c-link" href="${href}">${m}</a>\u0002`);
  }
  // 还原分隔符
  return out.replace(/\u0001|\u0002/g, '');
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
