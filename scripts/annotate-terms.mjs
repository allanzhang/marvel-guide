// 全站名词中英标注脚本：中文（英文）
// 处理 content/*.json 的 prose 字段。
// 分字段应用词表：title/subtitle/name 用「专名表」，正文用「广义表」。
// 规则：长词优先 / 已带英文跳过 / 词表内不含片名成分词避免误伤。
import { readFileSync, writeFileSync } from 'node:fs';

/* ============ 词表 ============ */

// 电影片名全称（长词优先，绝不单列片名内的成分词）
const MOVIE_TITLES = {
  '美国队长：复仇者先锋': 'Captain America: The First Avenger',
  '美国队长2：冬日战士': 'Captain America: The Winter Soldier',
  '美国队长3：内战': 'Captain America: Civil War',
  '复仇者联盟2：奥创纪元': 'Avengers: Age of Ultron',
  '复仇者联盟3：无限战争': 'Avengers: Infinity War',
  '复仇者联盟4：终局之战': 'Avengers: Endgame',
  '蜘蛛侠：英雄归来': 'Spider-Man: Homecoming',
  '蜘蛛侠：英雄远征': 'Spider-Man: Far From Home',
  '蜘蛛侠：英雄无归': 'Spider-Man: No Way Home',
  '奇异博士2：疯狂多元宇宙': 'Doctor Strange in the Multiverse of Madness',
  '雷神4：爱与雷霆': 'Thor: Love and Thunder',
  '黑豹2：瓦坎达万岁': 'Black Panther: Wakanda Forever',
  '蚁人3：量子狂潮': 'Ant-Man and the Wasp: Quantumania',
  '银河护卫队3': 'Guardians of the Galaxy Vol. 3',
  '惊奇队长2': 'The Marvels',
  '死侍与金刚狼': 'Deadpool & Wolverine',
  '美国队长4：勇敢新世界': 'Captain America: Brave New World',
  '神奇四侠：初露锋芒': 'The Fantastic Four: First Steps',
  '蜘蛛侠4：全新日': 'Spider-Man: Brand New Day',
  '复仇者：毁灭日': 'Avengers: Doomsday',
  '复仇者：秘密战争': 'Avengers: Secret Wars',
  '雷神2：黑暗世界': 'Thor: The Dark World',
  '雷神3：诸神黄昏': 'Thor: Ragnarok',
  '蚁人2：黄蜂女现身': 'Ant-Man and the Wasp',
  '银河护卫队2': 'Guardians of the Galaxy Vol. 2',
  '钢铁侠': 'Iron Man',
  '钢铁侠2': 'Iron Man 2',
  '钢铁侠3': 'Iron Man 3',
  '无敌浩克': 'The Incredible Hulk',
  '复仇者联盟': 'The Avengers',
  '雷神': 'Thor',
  '美国队长': 'Captain America',
  '银河护卫队': 'Guardians of the Galaxy',
  '奇异博士': 'Doctor Strange',
  '黑豹': 'Black Panther',
  '黑寡妇': 'Black Widow',
  '蚁人': 'Ant-Man',
  '惊奇队长': 'Captain Marvel',
};

// 人物（含称号/别名）——用于正文
const PEOPLE = {
  '史蒂夫·罗杰斯': 'Steve Rogers', '美国队长': 'Captain America', '美队': 'Cap',
  '托尼·斯塔克': 'Tony Stark', '钢铁侠': 'Iron Man',
  '索尔': 'Thor', '雷神': 'Thor', '布鲁斯·班纳': 'Bruce Banner', '班纳博士': 'Dr. Banner', '浩克': 'Hulk', '绿巨人': 'Hulk',
  '娜塔莎·罗曼诺夫': 'Natasha Romanoff', '黑寡妇': 'Black Widow', '鹰眼': 'Hawkeye', '克林特·巴顿': 'Clint Barton',
  '彼得·帕克': 'Peter Parker', '蜘蛛侠': 'Spider-Man', '特查拉': 'T\'Challa', '黑豹': 'Black Panther',
  '卡罗尔·丹佛斯': 'Carol Danvers', '惊奇队长': 'Captain Marvel', '斯科特·朗': 'Scott Lang', '蚁人': 'Ant-Man',
  '史蒂芬·斯特兰奇': 'Stephen Strange', '奇异博士': 'Doctor Strange',
  '彼得·奎尔': 'Peter Quill', '星爵': 'Star-Lord', '卡魔拉': 'Gamora', '德拉克斯': 'Drax',
  '火箭浣熊': 'Rocket', '火箭': 'Rocket', '格鲁特': 'Groot', '树人格鲁特': 'Groot',
  '旺达·马克西莫夫': 'Wanda Maximoff', '猩红女巫': 'Scarlet Witch', '幻视': 'Vision', '古一': 'Ancient One', '至尊法师': 'Sorcerer Supreme',
  '灭霸': 'Thanos', '疯狂泰坦': 'Mad Titan', '洛基': 'Loki', '诡计之神': 'God of Mischief',
  '奥创': 'Ultron', '红骷髅': 'Red Skull', '约翰·施密特': 'Johann Schmidt', '憎恶': 'Abomination',
  '埃米尔·布朗斯基': 'Emil Blonsky', '布朗斯基': 'Blonsky', '海拉': 'Hela',
  '罗南': 'Ronan', '伊戈': 'Ego', '克尔芒戈': 'Killmonger', '埃里克·克尔芒戈': 'Killmonger', '秃鹫': 'Vulture', '神秘客': 'Mysterio', '奥巴代亚·斯坦': 'Obadiah Stane', '基里安': 'Killian', '玛威尔': 'Mar-Vell', '劳森': 'Lawson', '伊森': 'Yinsen', '厄斯金': 'Erskine',
  '奥丁': 'Odin', '快银': 'Quicksilver', '佩姬·卡特': 'Peggy Carter', '佩吉·卡特': 'Peggy Carter',
  '汉克·皮姆': 'Hank Pym', '霍普·凡·戴恩': 'Hope van Dyne', '黄蜂女': 'Wasp', '山姆·威尔逊': 'Sam Wilson', '猎鹰': 'Falcon', '巴基·巴恩斯': 'Bucky Barnes', '冬日战士': 'Winter Soldier', '尼克·弗瑞': 'Nick Fury', '战争机器': 'War Machine', '詹姆斯·罗德斯': 'James Rhodes', '小辣椒': 'Pepper Potts', '佩珀·波茨': 'Pepper Potts', '苏睿': 'Shuri', '女武神': 'Valkyrie', '瓦尔基里': 'Valkyrie', '简·福斯特': 'Jane Foster', '叶莲娜·贝洛娃': 'Yelena Belova', '罗斯将军': 'General Ross', '撒迪厄斯·罗斯': 'Thaddeus Ross', '伊万·万科': 'Ivan Vanko', '鞭索': 'Whiplash', '贾维斯': 'J.A.R.V.I.S.',
  '尚气': 'Shang-Chi', '文武': 'Wenwu', '永恒族': 'Eternals', '伊卡瑞斯': 'Ikaris', '瑟西': 'Sersi', '变异族': 'Deviants', '天神族': 'Celestials',
  '征服者康': 'Kang the Conqueror', '康': 'Kang', '遗留之人': 'He Who Remains', '卡玛拉·汗': 'Kamala Khan', '惊奇女士': 'Ms. Marvel', '莫妮卡·兰博': 'Monica Rambeau', '光谱': 'Photon',
  '死侍': 'Deadpool', '韦德·威尔逊': 'Wade Wilson', '金刚狼': 'Wolverine', '詹姆斯·豪利特': 'James Howlett', '神奇先生': 'Mister Fantastic', '里德·理查兹': 'Reed Richards', '隐形女': 'Invisible Woman', '苏·斯托姆': 'Sue Storm', '屠神者格尔': 'Gorr the God Butcher', '纳摩': 'Namor',
  '雷霆特攻队': 'Thunderbolts', '塔洛坎': 'Talokan',
};

// 地点 / 组织 / 星球
const PLACES = {
  '阿斯加德': 'Asgard', '泰坦星': 'Titan', '泰坦': 'Titan', '萨卡星球': 'Sakaar', '萨卡': 'Sakaar',
  '瓦坎达': 'Wakanda', '索科维亚': 'Sokovia', '阿富汗': 'Afghanistan', '布鲁克林': 'Brooklyn',
  '卡玛泰姬': 'Kamar-Taj', '沃米尔': 'Vormir', '量子领域': 'Quantum Realm', '仙宫': 'Asgard',
  '神盾局': 'S.H.I.E.L.D.', '九头蛇': 'Hydra', '红房子': 'Red Room', '斯塔克工业': 'Stark Industries',
  '战略科学预备队': 'S.S.R.', '银河系': 'the galaxy', '天上地球': 'Midgard',
  '漫威电影宇宙': 'the Marvel Cinematic Universe', '多元宇宙': 'the Multiverse',
  '时间变异管理局': 'the Time Variance Authority', '神圣时间线': 'the Sacred Timeline',
  '西景镇': 'Westview', '昆仑': 'K\'un-Lun', '地狱厨房': 'Hell\'s Kitchen', '手合会': 'the Hand',
  '旺达幻视': 'WandaVision', '猎鹰与冬兵': 'The Falcon and the Winter Soldier',
  '无限传奇': 'the Infinity Saga',
};

// 道具 / 武器 / 概念
const ITEMS = {
  '无限宝石': 'the Infinity Stones', '宇宙魔方': 'the Tesseract', '空间宝石': 'Space Stone',
  '时间宝石': 'Time Stone', '现实宝石': 'Reality Stone', '心灵宝石': 'Mind Stone', '灵魂宝石': 'Soul Stone',
  '力量宝石': 'Power Stone', '以太': 'the Aether', '雷神之锤': 'Mjolnir', '神锤': 'Mjolnir',
  '振金': 'Vibranium', '皮姆粒子': 'Pym Particles', '蚁人战衣': 'Ant-Man Suit', '黄蜂女战衣': 'Wasp Suit',
  '无限手套': 'the Infinity Gauntlet', '绝境病毒': 'Extremis', '超级士兵血清': 'the Super Soldier Serum',
  '光速引擎': 'the Light-Speed Engine', '齐塔瑞大军': 'the Chitauri', '黑暗精灵': 'the Dark Elves',
  '九界': 'the Nine Realms', '响指': 'the Snap', '混沌魔法': 'Chaos Magic',
};

// 已带英文保护：词后紧跟英文括号则跳过
const PAREN_EN = /[（(].{1,60}?[)）]/;

const read = (p) => JSON.parse(readFileSync(`${process.cwd()}/content/${p}`, 'utf8'));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toTerms(map){
  return Object.entries(map).sort((a,b)=>b[0].length-a[0].length);
}

// 对单一词执行标注（若已带该英文则跳过）
function annotate(text, terms){
  // 单趟最长匹配：从左到右扫描每个位置，匹配最长的术语并整体跳过后继字符。
  // 保证短词不会破坏长词（长词整体被吞掉）。
  // 幂等保护：若该词后紧跟「（英文）」形态，视为已标注，跳过不重复标注。
  let result = '';
  let i = 0;
  const n = text.length;
  while (i < n){
    let matchedLen = 0, matchedEn = null;
    for (const [zh, en] of terms){
      if (text.startsWith(zh, i)){
        // 幂等检查：zh 之后紧跟「（英文）」则跳过（已标注过）
        const rest = text.slice(i + zh.length);
        if (/^\s*[（(][A-Za-z][^）)]*[)）]/.test(rest)) { break; }
        matchedLen = zh.length;
        matchedEn = en;
        break; // terms 已按长度降序，第一个命中即最长
      }
    }
    if (matchedLen > 0){
      result += text.slice(i, i + matchedLen) + '（' + matchedEn + '）';
      i += matchedLen;
    } else {
      result += text[i];
      i += 1;
    }
  }
  return result;
}

// 篇章名（一层导航，需英文）
const ERA_NAME = {
  '远古与二战': 'The Ancient Times & WWII',
  '复仇者集结': 'The Avengers Assemble',
  '内战与分裂': 'Civil War & Division',
  '无限战争': 'Infinity War',
  '多元宇宙时代': 'The Multiverse Era',
};

const FIELD_PLAN = [
  { file: 'eras.json', fields: ['name','intro','heroTitle'], terms: toTerms({ ...ERA_NAME, ...PEOPLE, ...PLACES, ...ITEMS }) },
  { file: 'movies.json', fields: ['title'], terms: toTerms(MOVIE_TITLES) },
  { file: 'movies.json', fields: ['summary','crossUniverseNote'], terms: toTerms({ ...MOVIE_TITLES, ...PEOPLE, ...PLACES, ...ITEMS }) },
  { file: 'characters.json', fields: ['name','alias','who','role','storyline'], terms: toTerms({ ...PEOPLE, ...PLACES, ...ITEMS }) },
  { file: 'series.json', fields: ['title'], terms: toTerms(MOVIE_TITLES) },
  { file: 'series.json', fields: ['summary','backgroundNote','relationsNote','timelineNote'], terms: toTerms({ ...MOVIE_TITLES, ...PEOPLE, ...PLACES, ...ITEMS }) },
  { file: 'concepts.json', fields: ['name','summary','definition','origin'], terms: toTerms({ ...PEOPLE, ...PLACES, ...ITEMS }) },
];

for (const plan of FIELD_PLAN){
  const file = plan.file;
  const data = read(file);
  let touched = 0;
  for (const item of data){
    for (const f of plan.fields){
      if (typeof item[f] === 'string' && item[f]){
        const before = item[f];
        item[f] = annotate(item[f], plan.terms);
        if (item[f] !== before) touched++;
      }
    }
  }
  writeFileSync(`${process.cwd()}/content/${file}`, JSON.stringify(data, null, 2) + '\n');
  console.log(`${plan.file}: ${touched} 个字段已标注`);
}

console.log('全部完成');
