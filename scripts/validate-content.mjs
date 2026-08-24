// 数据引用完整性校验。任何一项失败即退出码 1。
import { existsSync, readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const eras = read('eras.json');
const movies = read('movies.json');
const characters = read('characters.json');
const series = read('series.json');
const concepts = read('concepts.json');
const errors = [];
const err = (msg) => errors.push(msg);
const recapStatuses = new Set(['core', 'supplementary', 'setup', 'upcoming']);
const placeholderRe = /(TBD|TODO|待补充|稍后补充|占位)/i;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isNonEmptyArray = (v) => Array.isArray(v) && v.length > 0;

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

// 角色弧线校验（workIds/charIds 已在引用完整性区定义）
for (const c of characters) {
  if (!c.characterArc) { err(`character ${c.id} 缺 characterArc`); continue; }
  if (!Array.isArray(c.characterArc.stages)) err(`character ${c.id} characterArc.stages 必须是数组`);
  if (!Array.isArray(c.characterArc.relationships)) err(`character ${c.id} characterArc.relationships 必须是数组`);
  for (const [i, stage] of (c.characterArc.stages || []).entries()) {
    if (!isNonEmptyString(stage.title)) err(`character ${c.id} stages[${i}] 缺 title`);
    if (!workIds.has(stage.work)) err(`character ${c.id} stages[${i}] 引用不存在作品: ${stage.work}`);
    if (!isNonEmptyString(stage.summary)) err(`character ${c.id} stages[${i}] 缺 summary`);
  }
  for (const [i, rel] of (c.characterArc.relationships || []).entries()) {
    if (!charIds.has(rel.with)) err(`character ${c.id} relationships[${i}] 引用不存在人物: ${rel.with}`);
    if (!isNonEmptyString(rel.type)) err(`character ${c.id} relationships[${i}] 缺 type`);
    if (!isNonEmptyString(rel.evolution)) err(`character ${c.id} relationships[${i}] 缺 evolution`);
    for (const wid of (rel.keyWorks || [])) {
      if (!workIds.has(wid)) err(`character ${c.id} relationships[${i}] 引用不存在作品: ${wid}`);
    }
  }
}

// 作品详情页主线信息：核心作品必须补齐全局定位、关键记忆点和片后状态
const storyRoleRequiredWorks = new Set([
  'captain-america-first-avenger', 'iron-man-1', 'thor-1', 'avengers-1',
  'winter-soldier', 'guardians-1', 'age-of-ultron', 'civil-war',
  'doctor-strange-1', 'ragnarok', 'ant-man-and-wasp', 'infinity-war',
  'endgame', 'spider-man-no-way-home', 'doctor-strange-2', 'ant-man-3',
  'avengers-doomsday', 'avengers-secret-wars', 'loki', 'wandavision'
]);
const narrativeRoleRequiredConcepts = new Set([
  'infinity-stones', 'space-stone', 'reality-stone', 'power-stone',
  'mind-stone', 'time-stone', 'soul-stone', 'multiverse', 'sacred-timeline',
  'time-branch', 'tva', 'quantum-realm', 'pym-particles', 'the-snap',
  'sokovia-accords', 'darkhold', 'chaos-magic', 'vibranium'
]);

function validateStoryRole(work, label) {
  const required = storyRoleRequiredWorks.has(work.id) || work.storyRole || work.keyTakeaways || work.aftermath;
  if (!required) return;
  if (!isNonEmptyString(work.storyRole)) err(`${label} 缺 storyRole`);
  if (!isNonEmptyArray(work.keyTakeaways)) err(`${label} 缺 keyTakeaways`);
  if (!work.aftermath || typeof work.aftermath !== 'object') err(`${label} 缺 aftermath`);
  if (work.aftermath) {
    for (const bucket of ['setup', 'payoff']) {
      if (!Array.isArray(work.aftermath[bucket])) err(`${label}.aftermath.${bucket} 必须是数组`);
      for (const item of work.aftermath[bucket] || []) {
        if (!isNonEmptyString(item)) err(`${label}.aftermath.${bucket} 存在空条目`);
      }
    }
    if (!isNonEmptyArray(work.aftermath.characterStates)) err(`${label}.aftermath.characterStates 必须是非空数组`);
    for (const [i, state] of (work.aftermath.characterStates || []).entries()) {
      if (!charIds.has(state.id)) err(`${label}.aftermath.characterStates[${i}] 引用不存在人物: ${state.id}`);
      if (!isNonEmptyString(state.state)) err(`${label} character ${state.id} 缺 state`);
    }
  }
  if (Array.isArray(work.keyTakeaways)) {
    for (const point of work.keyTakeaways) {
      if (!isNonEmptyString(point)) err(`${label}.keyTakeaways 存在空条目`);
    }
  }
}
for (const m of movies) validateStoryRole(m, `movie ${m.id}`);
for (const se of series) validateStoryRole(se, `series ${se.id}`);

function validateNarrativeRole(concept, label) {
  const required = narrativeRoleRequiredConcepts.has(concept.id) || concept.narrativeRole;
  if (!required) return;
  const role = concept.narrativeRole;
  if (!role || typeof role !== 'object') return err(`${label} 缺 narrativeRole`);
  if (!workIds.has(role.firstAppearance)) err(`${label}.narrativeRole.firstAppearance 引用不存在作品: ${role.firstAppearance}`);
  if (!isNonEmptyString(role.mainImpact)) err(`${label}.narrativeRole.mainImpact 缺失`);
  if (!isNonEmptyArray(role.keyMoments)) err(`${label}.narrativeRole.keyMoments 必须是非空数组`);
  if (!Array.isArray(role.relatedCharacters)) err(`${label}.narrativeRole.relatedCharacters 必须是数组`);
  for (const [i, cid] of (role.relatedCharacters || []).entries()) {
    if (!charIds.has(cid)) err(`${label}.narrativeRole.relatedCharacters[${i}] 引用不存在人物: ${cid}`);
  }
  for (const moment of role.keyMoments || []) {
    if (!isNonEmptyString(moment)) err(`${label}.narrativeRole.keyMoments 存在空条目`);
  }
  if (!isNonEmptyString(role.currentStatus)) err(`${label}.narrativeRole.currentStatus 缺失`);
}
for (const c of concepts) validateNarrativeRole(c, `concept ${c.id}`);


// 主线复盘数据：独立跨作品事件层
if (!existsSync(new URL('../content/recap.json', import.meta.url))) {
  err('recap.json 不存在');
} else {
  const recap = read('recap.json');
  if (recap.version !== 1) err('recap.version 必须为 1');
  if (!recap.intro || !isNonEmptyString(recap.intro.title)) err('recap.intro.title 缺失');
  for (const field of ['audience', 'spoilerNotice']) {
    if (!isNonEmptyString(recap.intro?.[field])) err(`recap.intro.${field} 缺失`);
  }
  if (!isNonEmptyArray(recap.intro?.howToRead)) err('recap.intro.howToRead 必须是非空数组');
  if (!isNonEmptyArray(recap.eras)) err('recap.eras 必须是非空数组');

  const eventIds = new Set();
  for (const [eraIndex, re] of recap.eras.entries()) {
    const eraLabel = `recap.eras[${eraIndex}]`;
    if (!eraIds.has(re.eraId)) err(`${eraLabel} 引用不存在的 eraId: ${re.eraId}`);
    for (const field of ['title', 'summary']) {
      if (!isNonEmptyString(re[field])) err(`${eraLabel}.${field} 缺失`);
    }
    if (!isNonEmptyArray(re.events)) err(`${eraLabel}.events 必须是非空数组`);

    for (const [eventIndex, event] of re.events.entries()) {
      const label = `recap event ${event.id || `#${eraIndex}-${eventIndex}`}`;
      if (!isNonEmptyString(event.id)) { err(`${label} 缺 id`); continue; }
      if (eventIds.has(event.id)) err(`${label} id 重复`);
      eventIds.add(event.id);
      for (const field of ['title', 'oneLine', 'timelineNote']) {
        if (!isNonEmptyString(event[field])) err(`${label} 缺 ${field}`);
      }
      if (!recapStatuses.has(event.status)) err(`${label} 非法 status: ${event.status}`);
      if (!isNonEmptyArray(event.body)) err(`${label}.body 必须是非空数组`);
      if (!isNonEmptyArray(event.turningPoints)) err(`${label}.turningPoints 必须是非空数组`);
      if (!isNonEmptyArray(event.characterChanges)) err(`${label}.characterChanges 必须是非空数组`);
      if (!isNonEmptyArray(event.conceptThreads)) err(`${label}.conceptThreads 必须是非空数组`);
      if (!event.relatedWorks || !isNonEmptyArray(event.relatedWorks.core)) err(`${label}.relatedWorks.core 必须是非空数组`);

      for (const paragraph of event.body) {
        if (!isNonEmptyString(paragraph)) err(`${label}.body 存在空段落`);
        if (placeholderRe.test(paragraph)) err(`${label}.body 含占位文本`);
      }
      for (const point of event.turningPoints) {
        if (!isNonEmptyString(point)) err(`${label}.turningPoints 存在空条目`);
      }
      for (const [i, change] of event.characterChanges.entries()) {
        if (!charIds.has(change.id)) err(`${label}.characterChanges[${i}] 引用不存在人物: ${change.id}`);
        if (!isNonEmptyString(change.summary)) err(`${label} character ${change.id} 缺 summary`);
      }
      for (const [i, thread] of event.conceptThreads.entries()) {
        if (!conceptIds.has(thread.id)) err(`${label}.conceptThreads[${i}] 引用不存在概念: ${thread.id}`);
        if (!isNonEmptyString(thread.summary)) err(`${label} concept ${thread.id} 缺 summary`);
      }
      const seenWorks = new Set();
      for (const bucket of ['core', 'supplementary']) {
        for (const wid of event.relatedWorks[bucket] || []) {
          if (!workIds.has(wid)) err(`${label}.relatedWorks.${bucket} 引用不存在作品: ${wid}`);
          if (seenWorks.has(wid)) err(`${label} 重复引用作品: ${wid}`);
          seenWorks.add(wid);
        }
      }
      for (const [i, note] of (event.extendedNotes || []).entries()) {
        if (!isNonEmptyString(note.title)) err(`${label}.extendedNotes[${i}] 缺 title`);
        if (!isNonEmptyArray(note.body)) err(`${label}.extendedNotes[${i}].body 必须是非空数组`);
        for (const paragraph of note.body) {
          if (!isNonEmptyString(paragraph)) err(`${label}.extendedNotes[${i}] 存在空段落`);
        }
      }
      if (event.status === 'upcoming') {
        if (!isNonEmptyArray(event.knownThreads)) err(`${label} upcoming 事件缺 knownThreads`);
        if (!isNonEmptyArray(event.openQuestions)) err(`${label} upcoming 事件缺 openQuestions`);
      }
    }
  }
}

// FAQ：常见疑问独立内容层
if (!existsSync(new URL('../content/faq.json', import.meta.url))) {
  err('faq.json 不存在');
} else {
  const faq = read('faq.json');
  if (faq.version !== 1) err('faq.version 必须为 1');
  if (!faq.intro || !isNonEmptyString(faq.intro.title) || !isNonEmptyString(faq.intro.lead)) err('faq.intro 不完整');
  if (!isNonEmptyArray(faq.questions)) err('faq.questions 必须是非空数组');
  const faqIds = new Set();
  for (const [i, q] of faq.questions.entries()) {
    const label = `faq question ${q.id || `#${i}`}`;
    if (!isNonEmptyString(q.id)) { err(`${label} 缺 id`); continue; }
    if (faqIds.has(q.id)) err(`${label} id 重复`);
    faqIds.add(q.id);
    for (const field of ['category', 'question', 'shortAnswer']) {
      if (!isNonEmptyString(q[field])) err(`${label} 缺 ${field}`);
    }
    if (!isNonEmptyArray(q.answer)) err(`${label}.answer 必须是非空数组`);
    for (const paragraph of q.answer || []) {
      if (!isNonEmptyString(paragraph)) err(`${label}.answer 存在空段落`);
    }
    for (const wid of q.relatedWorks || []) if (!workIds.has(wid)) err(`${label} 引用不存在作品: ${wid}`);
    for (const cid of q.relatedCharacters || []) if (!charIds.has(cid)) err(`${label} 引用不存在人物: ${cid}`);
    for (const cid of q.relatedConcepts || []) if (!conceptIds.has(cid)) err(`${label} 引用不存在概念: ${cid}`);
  }
}


if (errors.length) {
  console.error(`✗ 校验失败，${errors.length} 个问题:\n` + errors.map(e => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ 校验通过: ${eras.length} 篇章 / ${movies.length} 部电影 / ${series.length} 部剧集 / ${characters.length} 个人物 / ${concepts.length} 个概念，全部引用有效`);
