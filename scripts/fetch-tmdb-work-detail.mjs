// 拉取作品剧照（4张）、完整剧情（overview）和精选影评（3条）
// 用法：node scripts/fetch-tmdb-work-detail.mjs [--dry]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx), l.slice(idx + 1)];
  })
);
const KEY = env.TMDB_API_KEY;
const API = 'https://api.tmdb.org/3';
const IMG_HD = 'https://image.tmdb.org/t/p/w1280';
const OUT_STILLS = 'public/stills';
const PY = '/Users/allan/.workbuddy/binaries/python/envs/default/bin/python';

const dry = process.argv.includes('--dry');

const extractEn = (title) => {
  const m = String(title).match(/（(.+?)）$/);
  return m ? m[1] : '';
};

const SEARCH_OVERRIDES = {
  'daredevil': 'Marvel\'s Daredevil',
  'defenders': 'Marvel\'s The Defenders',
  'punisher': 'Marvel\'s The Punisher',
  'agents-of-shield': 'Agents of S.H.I.E.L.D.',
};

const get = (url) => execSync(`curl -s --max-time 25 "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function pickBest(results, enName) {
  if (!results || !results.length) return null;
  const enLower = enName.toLowerCase();
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(enName);
  return results.find(r => (r.title || r.name || '').toLowerCase() === enLower)
    || results.find(r => target && norm(r.title || r.name).includes(target) && target.length >= 6)
    || results[0];
}

function download(url, outPath) {
  const tmp = outPath.replace(/\.webp$/, '.tmp');
  try {
    execSync(`env -u https_proxy -u http_proxy -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u all_proxy curl -s --max-time 30 -o "${tmp}" "${url}"`, { encoding: 'utf8' });
    if (!existsSync(tmp)) return false;
    execSync(`"${PY}" -c "from PIL import Image; im=Image.open('${tmp}').convert('RGB'); im.thumbnail((1600,900)); im.save('${outPath}','WEBP',quality=80)"`, { encoding: 'utf8' });
    execSync(`rm -f "${tmp}"`);
    return true;
  } catch { return false; }
}

async function main() {
  mkdirSync(OUT_STILLS, { recursive: true });
  let okCount = 0;

  for (const file of ['content/movies.json', 'content/series.json']) {
    const items = JSON.parse(readFileSync(file, 'utf8'));
    let changed = false;
    for (const item of items) {
      if (item.overview && item.stills?.length > 0 && item.reviews?.length > 0) {
        console.log('·', item.id, '已有数据，跳过');
        continue;
      }
      const en = SEARCH_OVERRIDES[item.id] || extractEn(item.title);
      const searchType = file.includes('movies') ? 'movie' : 'tv';
      try {
        // 1. Search
        const searchUrl = `${API}/search/${searchType}?api_key=${KEY}&query=${encodeURIComponent(en)}`;
        const searchData = JSON.parse(get(searchUrl) || '{}');
        const best = pickBest(searchData.results, en);
        if (!best) { console.log('x', item.id, '未匹配'); continue; }
        const tmdbId = best.id;
        console.log('→', item.id, '=', best.title || best.name, `tmdb:${tmdbId}`);

        // 2. Overview
        if (!item.overview) {
          const detailUrl = `/${searchType}/${tmdbId}?api_key=${KEY}&language=zh-CN`;
          const detailData = JSON.parse(get(`${API}${detailUrl}`) || '{}');
          if (detailData.overview) {
            item.tmdbId = tmdbId;
            item.overview = detailData.overview;
            changed = true;
            console.log('  v overview:', detailData.overview.slice(0, 40) + '…');
          }
        }

        // 3. Stills
        if (!item.stills || item.stills.length === 0) {
          const imagesUrl = `${API}/${searchType}/${tmdbId}/images?api_key=${KEY}&include_image_language=en,null,zh`;
          const imagesData = JSON.parse(get(imagesUrl) || '{}');
          const backdrops = (imagesData.backdrops || []).slice(0, 4);
          item.stills = [];
          for (let i = 0; i < backdrops.length; i++) {
            const filename = `still-${item.id}-${i + 1}.webp`;
            const outPath = `${OUT_STILLS}/${filename}`;
            const url = `${IMG_HD}${backdrops[i].file_path}`;
            if (!dry && download(url, outPath)) {
              item.stills.push(`/stills/${filename}`);
              console.log(`  v still ${i + 1}`);
            } else if (dry) {
              item.stills.push(`/stills/${filename}`);
              console.log(`  · dry still ${i + 1}`);
            }
            if (item.stills.length >= 4) break;
            }
          changed = true;
        }

        // 4. Reviews
        if (!item.reviews || item.reviews.length === 0) {
          const reviewsUrl = `${API}/${searchType}/${tmdbId}/reviews?api_key=${KEY}&language=en-US&page=1`;
          const reviewsData = JSON.parse(get(reviewsUrl) || '{}');
          item.reviews = (reviewsData.results || [])
            .sort((a, b) => (b.author_details?.rating || 0) - (a.author_details?.rating || 0))
            .slice(0, 3).map(r => ({
              author: r.author,
              rating: r.author_details?.rating,
              content: r.content.replace(/<[^>]*>/g,'').trim()
            }));
          changed = true;
        }
      } catch(e) {
        console.log('x', item.id, e.message.slice(0,60));
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (changed) writeFileSync(file, JSON.stringify(items, null, 2) + '\n');
  }
  console.log('done');
}
main();
