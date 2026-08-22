// 占位海报/肖像生成：按时代主题色生成 SVG，输出到 public/
// 后续接真实海报时，替换 public/posters 与 public/portraits 下的同名文件即可，代码零改动
import { mkdirSync, writeFileSync } from 'node:fs';
import { eras, movies, characters, eraById } from '../src/lib/data.mjs';

const OUT_POSTERS = 'public/posters';
const OUT_PORTRAITS = 'public/portraits';
mkdirSync(OUT_POSTERS, { recursive: true });
mkdirSync(OUT_PORTRAITS, { recursive: true });

// 竖版电影海报 3:4.4
function posterSVG(m, era) {
  const lines = wrapChinese(m.title, 4);
  const subtitle = m.subtitle || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 880" width="600" height="880">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${era.color}"/>
      <stop offset="100%" stop-color="#0e0f10"/>
    </linearGradient>
  </defs>
  <rect width="600" height="880" fill="url(#g)"/>
  <rect width="600" height="880" fill="none" stroke="${era.colorSoft}" stroke-opacity="0.35" stroke-width="6"/>
  <text x="40" y="76" font-family="'Songti SC','Noto Serif SC',serif" font-size="22" fill="${era.colorSoft}" letter-spacing="6">MARVEL 电影世界</text>
  <text x="560" y="76" text-anchor="end" font-family="'PingFang SC',sans-serif" font-size="20" fill="${era.colorSoft}" letter-spacing="2">${m.yearLabel}</text>
  <g transform="translate(300, 440)">
    ${lines.map((l, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * 64}" text-anchor="middle" font-family="'Songti SC','Noto Serif SC',serif" font-weight="700" font-size="52" fill="#fff" letter-spacing="4">${l}</text>`).join('\n    ')}
  </g>
  <text x="300" y="790" text-anchor="middle" font-family="'PingFang SC',sans-serif" font-size="20" fill="${era.colorSoft}" letter-spacing="3">${subtitle}</text>
  <text x="300" y="828" text-anchor="middle" font-family="'PingFang SC',sans-serif" font-size="14" fill="${era.colorSoft}" fill-opacity="0.7">时间线图鉴 · ${era.name}</text>
</svg>`;
}

// 方形肖像 3:3.6
function portraitSVG(c) {
  const era = eraById[c.eraId] || eras[0];
  const color = era.color;
  const soft = era.colorSoft;
  const name = c.alias ? `${c.name}\n${c.alias}` : c.name;
  const [n1, n2] = name.split('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" width="600" height="720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#0e0f10"/>
    </linearGradient>
  </defs>
  <rect width="600" height="720" fill="url(#g)"/>
  <circle cx="300" cy="300" r="150" fill="none" stroke="${soft}" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="300" cy="300" r="105" fill="none" stroke="${soft}" stroke-opacity="0.25" stroke-width="2"/>
  <text x="300" y="300" text-anchor="middle" dominant-baseline="middle" font-family="'Songti SC','Noto Serif SC',serif" font-weight="700" font-size="40" fill="#fff" letter-spacing="3">${c.alias || c.name}</text>
  <text x="300" y="560" text-anchor="middle" font-family="'PingFang SC',sans-serif" font-size="24" fill="${soft}">${n1 || ''}</text>
  ${n2 ? `<text x="300" y="596" text-anchor="middle" font-family="'PingFang SC',sans-serif" font-size="20" fill="${soft}">${n2}</text>` : ''}
  <text x="300" y="668" text-anchor="middle" font-family="'PingFang SC',sans-serif" font-size="14" fill="${soft}" fill-opacity="0.7">${c.tagline || ''}</text>
</svg>`;
}

// 中文字换行（按字符数拆）
function wrapChinese(str, max) {
  const chars = Array.from(str.replace(/\s+/g, ''));
  const out = [];
  for (let i = 0; i < chars.length; i += max) out.push(chars.slice(i, i + max).join(''));
  return out;
}

let nP = 0, nQ = 0;
for (const m of movies) {
  const era = eraById[m.eraId];
  writeFileSync(`${OUT_POSTERS}/poster-${m.id}.svg`, posterSVG(m, era));
  nP++;
}
for (const c of characters) {
  // 从该人物第一部电影推断主题色，作为肖像主色
  const firstMovie = c.movies.length ? movies.find((m) => m.id === c.movies[0]) : null;
  const era = (firstMovie && eraById[firstMovie.eraId]) || eras[0];
  const data = { ...c, eraId: era.id };
  writeFileSync(`${OUT_PORTRAITS}/portrait-${c.id}.svg`, portraitSVG(data));
  nQ++;
}

console.log(`✓ 生成占位图: ${nP} 张海报 / ${nQ} 张肖像 → ${OUT_POSTERS} / ${OUT_PORTRAITS}`);
