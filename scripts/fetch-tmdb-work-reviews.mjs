// 补抓作品影评：优先中文（TMDB zh-CN），不足时用英文回退。
// 每条影评带 lang 字段：'zh' | 'en'
// 用法：node scripts/fetch-tmdb-work-reviews.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx), l.slice(idx + 1)];
  })
);
const KEY = env.TMDB_API_KEY;
const API = 'https://api.tmdb.org/3';
const dry = process.argv.includes('--dry');

const get = (url) => execSync(`curl -s --max-time 25 "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s);

function fetchReviews(type, tmdbId, lang) {
  const out = [];
  for (let page = 1; page <= 2; page++) {
    try {
      const url = `${API}/${type}/${tmdbId}/reviews?api_key=${KEY}&language=${lang}&page=${page}`;
      const data = JSON.parse(get(url) || '{}');
      for (const r of data.results || []) {
        out.push({
          author: r.author,
          rating: r.author_details?.rating || null,
          content: r.content.replace(/<[^>]*>/g, '').trim(),
        });
      }
      if (page >= (data.total_pages || 1)) break;
    } catch {
      break;
    }
  }
  return out;
}

function main() {
  let zhCount = 0, enCount = 0, done = 0;
  for (const file of ['content/movies.json', 'content/series.json']) {
    const items = JSON.parse(readFileSync(file, 'utf8'));
    let changed = false;
    for (const item of items) {
      if (!item.tmdbId) continue;
      // 已有中文影评则跳过
      if ((item.reviews || []).some((r) => r.lang === 'zh')) { done++; continue; }
      const type = file.includes('movies') ? 'movie' : 'tv';
      const zh = fetchReviews(type, item.tmdbId, 'zh-CN').filter((r) => hasCJK(r.content));
      const en = fetchReviews(type, item.tmdbId, 'en-US');
      const reviews = [
        ...zh.slice(0, 3).map((r) => ({ ...r, lang: 'zh' })),
        ...en.slice(0, 3 - Math.min(zh.length, 3)).map((r) => ({ ...r, lang: 'en' })),
      ];
      if (!dry) {
        item.reviews = reviews;
        changed = true;
      }
      zhCount += reviews.filter((r) => r.lang === 'zh').length;
      enCount += reviews.filter((r) => r.lang === 'en').length;
      console.log(item.id, '->', reviews.filter((r) => r.lang === 'zh').length + 'zh', reviews.filter((r) => r.lang === 'en').length + 'en');
      done++;
    }
    if (changed) writeFileSync(file, JSON.stringify(items, null, 2) + '\n');
  }
  console.log(`\n[reviews] 完成 ${done} / 中文 ${zhCount} 条 / 英文 ${enCount} 条`);
}

main();
