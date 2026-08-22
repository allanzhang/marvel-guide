// 数据引用完整性校验。任何一项失败即退出码 1。
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const eras = read('eras.json');
const movies = read('movies.json');
const characters = read('characters.json');
const errors = [];
const err = (msg) => errors.push(msg);

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

// 必填字段
for (const m of movies) {
  for (const f of ['title', 'year', 'yearLabel', 'eraId', 'summary', 'characters']) {
    if (m[f] === undefined) err(`movie ${m.id} 缺字段 ${f}`);
  }
}
for (const c of characters) {
  for (const f of ['name', 'alias', 'tagline', 'group', 'who', 'role', 'storyline', 'movies']) {
    if (c[f] === undefined) err(`character ${c.id} 缺字段 ${f}`);
  }
}
for (const e of eras) {
  for (const f of ['name', 'years', 'startYear', 'color', 'colorSoft', 'intro']) {
    if (e[f] === undefined) err(`era ${e.id} 缺字段 ${f}`);
  }
}

// 引用完整性
const eraIds = new Set(eras.map(e => e.id));
const movieIds = new Set(movies.map(m => m.id));
const charIds = new Set(characters.map(c => c.id));
const groupAllowed = new Set(['avengers-core', 'solo', 'guardians', 'mystic', 'villains', 'support']);

for (const m of movies) {
  if (!eraIds.has(m.eraId)) err(`movie ${m.id} 引用了不存在的 eraId: ${m.eraId}`);
  for (const cid of m.characters) {
    if (!charIds.has(cid)) err(`movie ${m.id} 引用了不存在的人物: ${cid}`);
  }
}
for (const c of characters) {
  if (!groupAllowed.has(c.group)) err(`character ${c.id} 非法分组: ${c.group}`);
  for (const mid of c.movies) {
    if (!movieIds.has(mid)) err(`character ${c.id} 引用了不存在的电影: ${mid}`);
  }
}
// 双向一致性：电影引用的人物，其 movies 列表也应包含该电影
for (const m of movies) {
  for (const cid of m.characters) {
    const c = characters.find(x => x.id === cid);
    if (c && !c.movies.includes(m.id)) err(`双向链接断裂: ${c.id}.movies 缺少 ${m.id}`);
  }
}

if (errors.length) {
  console.error(`✗ 校验失败，${errors.length} 个问题:\n` + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ 校验通过: ${eras.length} 篇章 / ${movies.length} 部电影 / ${characters.length} 个人物，全部引用有效`);
