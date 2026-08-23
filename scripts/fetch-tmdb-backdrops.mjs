// 拉取章节头图 backdrop + 概念剧照 backdrop
// 用法：node scripts/fetch-tmdb-backdrops.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map((l) => l.split('='))
);
const KEY = env.TMDB_API_KEY;
const API = 'https://api.tmdb.org/3';
const IMG_HD = 'https://image.tmdb.org/t/p/w1280';
const OUT = 'public/backdrops';
const PY = '/Users/allan/.workbuddy/binaries/python/envs/default/bin/python';

const get = (url) => execSync(`curl -s --max-time 25 "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

function download(url, outPath) {
  const tmp = outPath.replace(/\.webp$/, '.tmp');
  try {
    execSync(`env -u https_proxy -u http_proxy -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u all_proxy curl -s --max-time 30 -o "${tmp}" "${url}"`, { encoding: 'utf8' });
    if (!existsSync(tmp)) return false;
    execSync(`"${PY}" -c "from PIL import Image; im=Image.open('${tmp}').convert('RGB'); im.thumbnail((1600, 900)); im.save('${outPath}', 'WEBP', quality=80)"`, { encoding: 'utf8' });
    execSync(`rm -f "${tmp}"`);
    return true;
  } catch (e) {
    return false;
  }
}

// 拉取作品 backdrop（电影/剧集 tmdb 搜索后取 detail）
function getBackdrop(tmdbType, id) {
  try {
    const d = JSON.parse(get(`${API}/${tmdbType}/${id}?api_key=${KEY}`));
    return d.backdrop_path || null;
  } catch { return null; }
}

// TMDB 作品 id（电影/剧集）：先用 search 定位，再取 backdrop
const TMDB_IDS = {
  // era 代表作品
  'era-ww2': ['movie', '1771'],            // 美国队长
  'era-assembly': ['movie', '24428'],      // 复仇者联盟
  'era-civil-war': ['movie', '271110'],    // 美队3内战
  'era-infinity': ['movie', '299536'],     // 无限战争
  'era-multiverse': ['movie', '634649'],   // 蜘蛛侠:英雄无归
  // 概念代表作品（用 detail 取 backdrop）
  'infinity-stones': ['movie', '299536'],
  'tesseract': ['movie', '1771'],
  'quantum-realm': ['movie', '363088'],
  'tva': ['tv', '84958'],
  'wakanda': ['movie', '284054'],
  'asgard': ['movie', '24428'],
  'kamar-taj': ['movie', '284052'],
  'hydra': ['movie', '271110'],
  'shield': ['movie', '24428'],
  'ten-rings': ['movie', '566525'],
  'vibranium': ['movie', '284054'],
  'multiverse': ['movie', '634649'],
  'the-snap': ['movie', '299537'],
  'mjolnir': ['movie', '284052'],
  'skrulls': ['movie', '299537'],
  'kree': ['movie', '299537'],
  'chitauri': ['movie', '24428'],
  'eternals-race': ['movie', '524434'],
  'celestials': ['movie', '524434'],
  'deviants': ['movie', '524434'],
  'mutants': ['movie', '533535'],
  'inhumans': ['tv', '60735'],
  'frost-giants': ['movie', '10195'],
  'dark-elves': ['movie', '76338'],
  'aether': ['movie', '76338'],
  'zehoberei': ['movie', '118340'],
  'darkhold': ['tv', '85271'],
  'chaos-magic': ['tv', '85271'],
  'sorcerer-supreme': ['movie', '284052'],
  'pym-particles': ['movie', '102899'],
  'sokovia-accords': ['movie', '271110'],
  'time-branch': ['tv', '84958'],
  'sacred-timeline': ['tv', '84958'],
  'nine-realms': ['movie', '10195'],
  'sakaar': ['movie', '284053'],
  'infinity-gauntlet': ['movie', '299536'],
  'space-stone': ['movie', '1771'],
  'time-stone': ['movie', '284052'],
  'reality-stone': ['movie', '76338'],
  'power-stone': ['movie', '118340'],
  'mind-stone': ['movie', '271110'],
  'soul-stone': ['movie', '299536'],
};

function main() {
  mkdirSync(OUT, { recursive: true });
  let ok = 0, fail = 0;
  for (const [name, [type, id]] of Object.entries(TMDB_IDS)) {
    const bd = getBackdrop(type, id);
    if (!bd) { console.log('x', name, '无 backdrop'); fail++; continue; }
    const out = `${OUT}/${name}.webp`;
    if (download(`${IMG_HD}${bd}`, out)) { ok++; console.log('v', name); }
    else { fail++; console.log('x', name, '下载失败'); }
  }
  console.log(`\n[backdrop] 成功 ${ok} / 失败 ${fail}`);
}

main();
