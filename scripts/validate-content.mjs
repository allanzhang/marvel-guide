// 数据引用完整性校验。任何一项失败即退出码 1。
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const eras = read('eras.json');
const movies = read('movies.json');
const characters = read('characters.json');
const series = read('series.json');
const concepts = read('concepts.json');
const errors = [];
const err = (msg) => errors.push(msg);
const watchPriorities = new Set(['must-watch', 'recommended', 'optional']);

// 唯一性
const checkUnique = (arr, label) => {
  const seen = new Set();
  for (const item of arr) {
    if (!item.id) { err(`${label} 缺少 id`); continue; }
    if (seen.has(item.id)) err(`${label} id 重复: ${item.id}`);
    seen.add(item.id);
  }
};
checkUnique(eras, 'era');
checkUnique(movies, 'movie');
checkUnique(characters, 'character');
checkUnique(series, 'series');
checkUnique(concepts, 'concept');

// 必填字段
for (const m of movies) {
  for (const f of ['title', 'year', 'yearLabel', 'eraId', 'summary', 'characters']) {
    if (m[f] === undefined) err(`movie ${m.id} 缺字段 ${f}`);
  }
  if (m.watchPriority !== undefined && !watchPriorities.has(m.watchPriority)) err(`movie ${m.id} 非法观看优先级: ${m.watchPriority}`);
  if (m.watchPriority !== undefined && m.skipImpact === undefined) err(`movie ${m.id} 缺字段 skipImpact`);
}
for (const s of series) {
  for (const f of ['title', 'year', 'yearLabel', 'eraId', 'type', 'seasons', 'summary', 'characters']) {
    if (s[f] === undefined) err(`series ${s.id} 缺字段 ${f}`);
  }
  if (s.type !== 'series') err(`series ${s.id} type 应为 'series'`);
  if (s.watchPriority !== undefined && !watchPriorities.has(s.watchPriority)) err(`series ${s.id} 非法观看优先级: ${s.watchPriority}`);
  if (s.watchPriority !== undefined && s.skipImpact === undefined) err(`series ${s.id} 缺字段 skipImpact`);
}
const conceptCats = new Set(['gem', 'item', 'magic', 'org', 'place', 'concept']);
for (const c of concepts) {
  for (const f of ['name', 'category', 'summary', 'definition', 'origin']) {
    if (c[f] === undefined) err(`concept ${c.id} 缺字段 ${f}`);
  }
  if (!conceptCats.has(c.category)) err(`concept ${c.id} 非法分类: ${c.category}`);
}
for (const c of characters) {
  for (const f of ['name', 'alias', 'tagline', 'group', 'who', 'role', 'storyline']) {
    if (c[f] === undefined) err(`character ${c.id} 缺字段 ${f}`);
  }
  if (!Array.isArray(c.movies || c.series)) err(`character ${c.id} 缺 movies/series 关联`);
}
for (const e of eras) {
  for (const f of ['name', 'years', 'startYear', 'color', 'colorSoft', 'intro']) {
    if (e[f] === undefined) err(`era ${e.id} 缺字段 ${f}`);
  }
  if (e.coreGoal !== undefined && e.coreGoal.length < 8) err(`era ${e.id} 的 coreGoal 过短`);
}

// 引用完整性
const eraIds = new Set(eras.map(e => e.id));
const movieIds = new Set(movies.map(m => m.id));
const seriesIds = new Set(series.map(s => s.id));
const workIds = new Set([...movieIds, ...seriesIds]);
const charIds = new Set(characters.map(c => c.id));
const conceptIds = new Set(concepts.map(c => c.id));
const groupAllowed = new Set(['avengers-core', 'solo', 'guardians', 'mystic', 'villains', 'support']);

for (const m of movies) {
  if (!eraIds.has(m.eraId)) err(`movie ${m.id} 引用了不存在的 eraId: ${m.eraId}`);
  for (const cid of m.characters) {
    if (!charIds.has(cid)) err(`movie ${m.id} 引用了不存在的人物: ${cid}`);
  }
}
for (const s of series) {
  if (!eraIds.has(s.eraId)) err(`series ${s.id} 引用了不存在的 eraId: ${s.eraId}`);
  for (const cid of s.characters) {
    if (!charIds.has(cid)) err(`series ${s.id} 引用了不存在的人物: ${cid}`);
  }
}
for (const c of characters) {
  if (!groupAllowed.has(c.group)) err(`character ${c.id} 非法分组: ${c.group}`);
  for (const mid of (c.movies || [])) {
    if (!movieIds.has(mid)) err(`character ${c.id} 引用了不存在的电影: ${mid}`);
  }
  for (const sid of (c.series || [])) {
    if (!seriesIds.has(sid)) err(`character ${c.id} 引用了不存在的剧集: ${sid}`);
  }
}
// 双向一致性：电影引用的人物，其 movies 列表也应包含该电影
for (const m of movies) {
  for (const cid of m.characters) {
    const c = characters.find(x => x.id === cid);
    if (c && !(c.movies || []).includes(m.id)) err(`双向链接断裂: ${c.id}.movies 缺少 ${m.id}`);
  }
}
// 双向一致性：剧集引用的人物，其 series 列表也应包含该剧集
for (const s of series) {
  for (const cid of s.characters) {
    const c = characters.find(x => x.id === cid);
    if (c && !(c.series || []).includes(s.id)) err(`双向链接断裂: ${c.id}.series 缺少 ${s.id}`);
  }
}
// 概念引用：appearances 必须指向存在的作品；related 必须指向存在的概念
for (const c of concepts) {
  for (const wid of (c.appearances || [])) {
    if (!workIds.has(wid)) err(`concept ${c.id} 引用了不存在的作品: ${wid}`);
  }
  for (const rid of (c.related || [])) {
    if (!conceptIds.has(rid)) err(`concept ${c.id} 引用了不存在的概念: ${rid}`);
  }
}

if (errors.length) {
  console.error(`✗ 校验失败，${errors.length} 个问题:\n` + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ 校验通过: ${eras.length} 篇章 / ${movies.length} 部电影 / ${series.length} 部剧集 / ${characters.length} 个人物 / ${concepts.length} 个概念，全部引用有效`);
