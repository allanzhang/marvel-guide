// TMDB 人物肖像拉取脚本
// 用法：node scripts/fetch-tmdb-portraits.mjs [--dry]
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(Boolean).map((l) => l.split('='))
);
const KEY = env.TMDB_API_KEY;
const API = 'https://api.tmdb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w780';
const OUT = 'public/portraits';
const PY = '/Users/allan/.workbuddy/binaries/python/envs/default/bin/python';

const dry = process.argv.includes('--dry');

// 角色 id -> TMDB person 搜索词（演员名）
const PERSON_OVERRIDES = {
  'steve-rogers': 'Chris Evans', 'tony-stark': 'Robert Downey Jr.', 'thor': 'Chris Hemsworth',
  'bruce-banner': 'Mark Ruffalo', 'natasha-romanoff': 'Scarlett Johansson', 'clint-barton': 'Jeremy Renner',
  'peter-parker': 'Tom Holland', 'stephen-strange': 'Benedict Cumberbatch', 'tchalla': 'Chadwick Boseman',
  'carol-danvers': 'Brie Larson', 'star-lord': 'Chris Pratt', 'gamora': 'Zoe Saldana',
  'drax': 'Dave Bautista', 'rocket': 'Bradley Cooper', 'groot': 'Vin Diesel',
  'wanda-maximoff': 'Elizabeth Olsen', 'vision': 'Paul Bettany', 'thanos': 'Josh Brolin',
  'loki': 'Tom Hiddleston', 'ultron': 'James Spader', 'red-skull': 'Hugo Weaving',
  'nick-fury': 'Samuel L. Jackson', 'peggy-carter': 'Hayley Atwell', 'bucky-barnes': 'Sebastian Stan',
  'sam-wilson': 'Anthony Mackie', 'pepper-potts': 'Gwyneth Paltrow', 'james-rhodes': 'Don Cheadle',
  'scott-lang': 'Paul Rudd', 'hank-pym': 'Michael Douglas', 'hope-van-dyne': 'Evangeline Lilly',
  'wong': 'Benedict Wong', 'ancient-one': 'Tilda Swinton', 'general-ross': 'William Hurt',
  'yelyena-belova': 'Florence Pugh', 'jane-foster': 'Natalie Portman', 'valkyrie': 'Tessa Thompson',
  'shuri': 'Letitia Wright', 'shang-chi': 'Simu Liu', 'ikaris': 'Richard Madden',
  'sersi': 'Gemma Chan', 'kang': 'Jonathan Majors', 'kamala-khan': 'Iman Vellani',
  'monica-rambeau': 'Teyonah Parris', 'deadpool': 'Ryan Reynolds', 'wolverine': 'Hugh Jackman',
  'reed-richards': 'Pedro Pascal', 'sue-storm': 'Vanessa Kirby',
  'odin': 'Anthony Hopkins', 'coulson': 'Clark Gregg', 'namor': 'Tenoch Huerta',
  'yondu': 'Michael Rooker', 'nebula': 'Karen Gillan', 'mantis': 'Pom Klementieff',
  'frigga': 'Rene Russo', 'heimdall': 'Idris Elba', 'kingpin': 'Vincent D\'Onofrio',
  'america-chavez': 'Xochitl Gomez', 'wenwu': 'Tony Leung', 'kate-bishop': 'Hailee Steinfeld',
  'vulture': 'Michael Keaton', 'daisy-johnson': 'Chloe Bennet',
  'kaecilius': 'Mads Mikkelsen', 'dormammu': 'Benedict Cumberbatch',
  'surtur': 'Clancy Brown',
  'matt-murdock': 'Charlie Cox', 'jessica-jones': 'Krysten Ritter',
  'luke-cage': 'Mike Colter', 'danny-rand': 'Finn Jones',
  'frank-castle': 'Jon Bernthal', 'steven-grant': 'Oscar Isaac',
  'jennifer-walters': 'Tatiana Maslany',
};

const get = (url) => {
  return execSync(`curl -s --max-time 25 "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
};

function download(url, outPath) {
  const tmp = outPath.replace(/\.webp$/, '.tmp');
  try {
    execSync(`env -u https_proxy -u http_proxy -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY -u all_proxy curl -s --max-time 25 -o "${tmp}" "${url}"`, { encoding: 'utf8' });
    if (!existsSync(tmp)) return false;
    execSync(`"${PY}" -c "from PIL import Image; im=Image.open('${tmp}').convert('RGB'); im.thumbnail((780, 1170)); im.save('${outPath}', 'WEBP', quality=82)"`, { encoding: 'utf8' });
    execSync(`rm -f "${tmp}"`);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const chars = JSON.parse(readFileSync('content/characters.json', 'utf8'));
  let ok = 0, fail = 0, skip = 0;

  for (const c of chars) {
    const out = `${OUT}/portrait-${c.id}.webp`;
    if (existsSync(out)) { skip++; continue; }
    const actor = PERSON_OVERRIDES[c.id];
    if (!actor) { console.log('-', c.id, '无演员映射，跳过'); skip++; continue; }
    const url = `${API}/search/person?api_key=${KEY}&query=${encodeURIComponent(actor)}`;
    let best = null;
    try {
      const data = JSON.parse(get(url) || '{}');
      best = (data.results || []).find((r) => r.profile_path);
    } catch { /* ignore */ }
    if (!best) { console.log('x', c.id, actor, '无肖像'); fail++; continue; }
    if (dry) { console.log('·', c.id, '->', best.name); ok++; continue; }
    if (download(`${IMG}${best.profile_path}`, out)) { ok++; console.log('v', c.id, '->', best.name); }
    else { fail++; console.log('x', c.id, actor); }
  }
  console.log(`\n[人物] 成功 ${ok} / 失败 ${fail} / 跳过 ${skip}`);
}

main().catch((e) => { console.error('脚本错误:', e); process.exit(1); });
