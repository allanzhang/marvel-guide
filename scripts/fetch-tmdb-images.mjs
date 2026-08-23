// TMDB 海报/肖像拉取脚本
// 用法：node scripts/fetch-tmdb-images.mjs [--type movie|series] [--dry]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 读取 .env.local
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map((l) => l.split('='))
);
const KEY = env.TMDB_API_KEY;
const API = 'https://api.tmdb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';
const OUT_POSTERS = 'public/posters';
const OUT_PORTRAITS = 'public/portraits';

const type = process.argv.includes('--type') ? process.argv[process.argv.indexOf('--type') + 1] : 'all';
const dry = process.argv.includes('--dry');

// 从「中文（English）」提取英文名
const extractEn = (title) => {
  const m = String(title).match(/（(.+?)）$/);
  return m ? m[1] : '';
};

// 搜索关键词覆盖（某些剧集默认匹配会错）
const SEARCH_OVERRIDES = {
  'daredevil': 'Marvel\'s Daredevil',
  'defenders': 'Marvel\'s The Defenders',
  'punisher': 'Marvel\'s The Punisher',
  'agents-of-shield': 'Agents of S.H.I.E.L.D.',
  'jessica-jones': 'Jessica Jones',
  'luke-cage': 'Luke Cage',
  'iron-fist': 'Iron Fist',
  'agent-carter': 'Agent Carter',
  'hawkeye': 'Hawkeye',
  'wandavision': 'WandaVision',
};

const get = (url) => {
  return execSync(`curl -s --max-time 25 "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
};

// 找最佳匹配：标题不区分大小写完全相等优先，否则包含
function pickBest(results, enName) {
  if (!results || !results.length) return null;
  const enLower = String(enName).toLowerCase();
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(enName);
  const exact = results.find((r) => (r.title || r.name || '').toLowerCase() === enLower);
  if (exact) return exact;
  const incl = results.find((r) => {
    const n = norm(r.title || r.name);
    return n === target || (target && n.includes(target) && target.length >= 6);
  });
  return incl || results[0];
}

// 下载图片并转 webp（Python Pillow）
const PY = '/Users/allan/.workbuddy/binaries/python/envs/default/bin/python';
function download(url, outPath) {
  const tmp = outPath.replace(/\.webp$/, '.tmp');
  try {
    execSync(`env -u https_proxy -u http_proxy -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u all_proxy curl -s --max-time 25 -o "${tmp}" "${url}"`, { encoding: 'utf8' });
    if (!existsSync(tmp)) { console.log('  x 下载失败:', url); return false; }
    execSync(`"${PY}" -c "from PIL import Image; im=Image.open('${tmp}').convert('RGB'); im.thumbnail((600, 900)); im.save('${outPath}', 'WEBP', quality=82)"`, { encoding: 'utf8' });
    execSync(`rm -f "${tmp}"`);
    return true;
  } catch (e) {
    console.log('  x 转换失败:', url, String(e.message).slice(0, 60));
    return false;
  }
}

async function main() {
  mkdirSync(OUT_POSTERS, { recursive: true });
  mkdirSync(OUT_PORTRAITS, { recursive: true });

  if (type === 'all' || type === 'movie') {
    const movies = JSON.parse(readFileSync('content/movies.json', 'utf8'));
    let ok = 0, fail = 0;
    for (const m of movies) {
      const en = extractEn(m.title);
      if (!en) { console.log('x', m.id, '无英文名'); fail++; continue; }
      const url = `${API}/search/movie?api_key=${KEY}&query=${encodeURIComponent(en)}`;
      const data = JSON.parse(get(url) || '{}');
      const best = pickBest(data.results, en);
      if (!best || !best.poster_path) { console.log('x', m.id, en, '无海报'); fail++; continue; }
      const out = `${OUT_POSTERS}/poster-${m.id}.webp`;
      if (dry) { console.log('·', m.id, '->', best.title, best.release_date || ''); ok++; continue; }
      const downloaded = download(`${IMG}${best.poster_path}`, out);
      if (downloaded) { ok++; console.log('v', m.id, '->', best.title); }
      else { fail++; console.log('x', m.id, en); }
    }
    console.log(`\n[电影] 成功 ${ok} / 失败 ${fail}`);
  }

  if (type === 'all' || type === 'series') {
    const series = JSON.parse(readFileSync('content/series.json', 'utf8'));
    let ok = 0, fail = 0;
    for (const s of series) {
      const en = SEARCH_OVERRIDES[s.id] || extractEn(s.title);
      if (!en) { console.log('x', s.id, '无英文名'); fail++; continue; }
      const url = `${API}/search/tv?api_key=${KEY}&query=${encodeURIComponent(en)}`;
      const data = JSON.parse(get(url) || '{}');
      const best = pickBest(data.results, en);
      if (!best || !best.poster_path) { console.log('x', s.id, en, '无海报'); fail++; continue; }
      const out = `${OUT_POSTERS}/poster-${s.id}.webp`;
      if (dry) { console.log('·', s.id, '->', best.name, best.first_air_date || ''); ok++; continue; }
      const downloaded = download(`${IMG}${best.poster_path}`, out);
      if (downloaded) { ok++; console.log('v', s.id, '->', best.name); }
      else { fail++; console.log('x', s.id, en); }
    }
    console.log(`\n[剧集] 成功 ${ok} / 失败 ${fail}`);
  }
}

main().catch((e) => { console.error('脚本错误:', e); process.exit(1); });
