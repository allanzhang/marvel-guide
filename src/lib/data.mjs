// 共享数据加载：所有页面统一从这里读取 JSON，避免路径不一致
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(`${process.cwd()}/content/${p}`, 'utf8'));

export const eras = read('eras.json');
export const movies = read('movies.json');
export const characters = read('characters.json');

export const charById = Object.fromEntries(characters.map((c) => [c.id, c]));
export const eraById = Object.fromEntries(eras.map((e) => [e.id, e]));

export const sortedEras = [...eras].sort((a, b) => a.startYear - b.startYear);
export const sortedMovies = [...movies].sort((a, b) => a.year - b.year || (a.order || 0) - (b.order || 0));

export const posterUrl = (id) => `/posters/poster-${id}.svg`;
export const portraitUrl = (id) => `/portraits/portrait-${id}.svg`;

// 人物分组顺序定义（人物墙用）
export const groupOrder = [
  ['avengers-core', '复仇者核心'],
  ['solo', '独行英雄'],
  ['guardians', '银河护卫队'],
  ['mystic', '神域与魔法'],
  ['villains', '反派堂'],
  ['support', '重要配角'],
];
