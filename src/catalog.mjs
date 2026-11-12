import { t } from './locale.mjs'

export const SOUNDS = [
  { id:"rain",    name:"雨",       en:"Rain",       cat:"nature", color:"#5b8db8" },
  { id:"wind",    name:"风",       en:"Wind",       cat:"nature", color:"#8b9a8e" },
  { id:"waves",   name:"海浪",     en:"Waves",      cat:"nature", color:"#4d9a94" },
  { id:"stream",  name:"溪流",     en:"Stream",     cat:"nature", color:"#4fa3a5" },
  { id:"thunder", name:"雷",       en:"Thunder",    cat:"nature", color:"#66707e", p:{bright:.22,dist:.55,density:.4} },
  { id:"birds",   name:"鸟鸣",     en:"Birds",      cat:"nature", color:"#7a9a52", p:{bright:.65} },
  { id:"insects", name:"虫鸣",     en:"Insects",    cat:"nature", color:"#8fae4c", p:{bright:.7,dist:.45} },
  { id:"fire",    name:"篝火",     en:"Fire",       cat:"nature", color:"#d97e3f" },
  { id:"cafe",    name:"咖啡馆人声", en:"Café Voices", cat:"city", color:"#a9743f" },
  { id:"traffic", name:"街道车流", en:"Traffic",    cat:"city",   color:"#9c6b4f", p:{bright:.35,dist:.5} },
  { id:"train",   name:"夜行火车", en:"Night Train", cat:"city",  color:"#7a7264", p:{bright:.25,dist:.5} },
  { id:"rural",   name:"乡村夜晚", en:"Rural Night", cat:"city",  color:"#6f7f56", p:{bright:.3,dist:.45} },
  { id:"market",  name:"市场",     en:"Market",     cat:"city",   color:"#c08a3e" },
  { id:"rainstreet", name:"雨夜街道", en:"Rainy Street", cat:"city", color:"#5b7fa6", p:{dist:.4} },
  { id:"piano",   name:"钢琴",     en:"Piano",      cat:"inst",   color:"#a8894f" },
  { id:"guitar",  name:"吉他拨弦", en:"Guitar",     cat:"inst",   color:"#b3854d" },
  { id:"chimes",  name:"风铃",     en:"Wind Chimes", cat:"inst",  color:"#7fb3c8", p:{bright:.78,density:.45} },
  { id:"muyu",    name:"木鱼 / 手鼓", en:"Wooden Fish & Drum", cat:"inst", color:"#a05c3f", p:{density:.6,bright:.4} },
  { id:"harp",    name:"单音竖琴", en:"Harp Notes", cat:"inst",   color:"#a58f5f", p:{bright:.6,density:.4} },
  { id:"forest", name:"森林", en:"Forest", cat:"nature", color:"#769478", p:{bright:.7} },
  { id:"boat", name:"船舱", en:"Boat Cabin", cat:"city", color:"#688e9b" },
  { id:"keyboard", name:"键盘轻敲", en:"Keyboard", cat:"city", color:"#b59477" }
];

export const RECIPES = [
  { name:"咖啡馆靠窗", nameEn:"Window Seat Café", tag:"写作", tagEn:"Writing", featured:true, intent:"写作", intentEn:"Writing", desc:"隔桌的谈话、键盘轻敲，偶尔有一两下吉他拨弦。", descEn:"Low talk at the next table, soft keyboard taps, a guitar now and then.", mix:{cafe:.62,keyboard:.38,guitar:.18} },
  { name:"雨夜独处", nameEn:"Rainy Night Alone", tag:"深度专注", tagEn:"Deep focus", featured:true, intent:"深度专注", intentEn:"Deep focus", desc:"窗外下着雨，远处的钢琴只留一点，适合埋头做一件事。", descEn:"Rain outside the window, a little piano far away — for burying yourself in one thing.", mix:{rain:.76,piano:.24,wind:.18} },
  { name:"篝火边", nameEn:"By the Campfire", tag:"放松", tagEn:"Relax", featured:true, intent:"短暂放松", intentEn:"A short break", desc:"坐在火堆边。风很轻，木柴偶尔响一下。", descEn:"Sitting by the fire. The wind is light, the wood pops now and then.", mix:{fire:.75,wind:.24,piano:.16} },
  { name:"海边清晨", nameEn:"Seaside Morning", tag:"阅读", tagEn:"Reading", desc:"鸟刚醒，浪一层一层推上来，留几页书的时间。", descEn:"The birds just woke, waves rolling in one after another, time for a few pages.", mix:{waves:.70,birds:.35,wind:.24} },
  { name:"林间小屋", nameEn:"Cabin in the Woods", tag:"阅读", tagEn:"Reading", premium:true, desc:"雨落在树叶上，溪水从屋后流过。", descEn:"Rain on the leaves, a stream running behind the house.", mix:{rain:.32,forest:.65,stream:.24} },
  { name:"乡村夜晚", nameEn:"Countryside Night", tag:"入夜", tagEn:"Nightfall", premium:true, desc:"虫鸣细碎，远处一班火车从田野边经过。", descEn:"Crickets in the dark, a train passing the fields far away.", mix:{rural:.6,insects:.38,train:.29,rain:.26} },
  { name:"市井专注", nameEn:"Street Focus", tag:"写作", tagEn:"Writing", premium:true, desc:"市场人声在前，木鱼和手鼓轻轻打着拍子。", descEn:"Market voices up front, wooden fish and hand drum keeping a soft beat.", mix:{market:.53,muyu:.25,cafe:.32,rain:.22} },
  { name:"午夜雷雨", nameEn:"Midnight Thunder", tag:"雨夜", tagEn:"Rainy night", premium:true, desc:"雨下得密，远处有雷，偶尔一辆车驶过积水。", descEn:"Rain falling thick, thunder far off, a car now and then through the puddles.", mix:{thunder:.34,rain:.75,rainstreet:.43} },
  { name:"末班车窗边", nameEn:"Last Train Window", tag:"放空", tagEn:"Unwind", premium:true, desc:"车厢轻轻震动，雨从窗边经过，竖琴留在远处。", descEn:"The carriage sways gently, rain passes the window, a harp far away.", mix:{train:.72,rain:.42,harp:.26} },
  { name:"港湾来信", nameEn:"Letters from the Harbour", tag:"放空", tagEn:"Unwind", premium:true, desc:"船舱随浪微晃，海风从身边吹过。", descEn:"The cabin rocks with the waves, sea wind brushing past.", mix:{boat:.62,waves:.38,wind:.28} }
];

/**
 * 按语言取展示文案（英文缺失时回落中文）。所有面向用户的名字、
 * 配方文案、自动配方名、配比汇总、配方卡片日期都走这里，
 * 保证英文界面不出现中文、中文界面不出现英文标签。
 * 用户自己输入的配方名不在这里处理——存下来的名字原样展示，绝不翻译。
 */

/** 单个通道的展示名：英文界面只显示英文名，中文界面只显示中文名。 */
export function soundDisplayName(sound, locale) {
  if (!sound) return '';
  return locale === 'en' ? (sound.en || sound.name) : sound.name;
}

/** 按语言取配方展示字段（英文缺失时回落中文；intent 缺失时回落 tag，
 * 只有精选配方才有 intent，但调用方不应拿到 undefined）。 */
export function recipeDisplay(recipe, locale) {
  if (!recipe) return { name: '', tag: '', intent: '', desc: '' };
  if (locale !== 'en') return { name: recipe.name, tag: recipe.tag, intent: recipe.intent || recipe.tag, desc: recipe.desc };
  return {
    name: recipe.nameEn || recipe.name,
    tag: recipe.tagEn || recipe.tag,
    intent: recipe.intentEn || recipe.intent || recipe.tagEn || recipe.tag,
    desc: recipe.descEn || recipe.desc,
  };
}

/**
 * 自动配方名：取音量最大的两个通道名 + 后缀。
 * active: [{ sound, level }]（按音量从大到小排好）。
 * 英文如 "Rain + Fire Night"，中文如 "雨 + 篝火 之夜"。
 */
export function autoRecipeName(active, locale) {
  const top = (active || []).slice(0, 2);
  if (!top.length) return '';
  const names = top.map(({ sound }) => soundDisplayName(sound, locale));
  return names.join(' + ') + t(locale, 'mine.nightSuffix');
}

/**
 * 当前配比汇总行：每个在调通道 "名字 音量"，用 " · " 连接。
 * active: [{ sound, level }]（level > 0.02 的通道）。
 * 空时返回与界面一致的空态文案。
 */
export function mixSummaryText(active, locale) {
  if (!active || !active.length) return t(locale, 'mine.saveEmpty');
  const parts = active.map(({ sound, level }) => `${soundDisplayName(sound, locale)} ${Math.round(level * 100)}`);
  return t(locale, 'mine.currentMixPrefix') + parts.join(' · ');
}

/**
 * 配方卡片上的保存时间，按界面语言格式化。
 * 英文如 "Nov 12, 00:55"，中文如 "11月12日 00:55"。
 */
export function formatRecipeDate(date, locale) {
  const d = date instanceof Date ? date : new Date(date);
  const lang = locale === 'en' ? 'en-US' : 'zh-CN';
  const day = d.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', hour12: false });
  return locale === 'en' ? `${day}, ${time}` : `${day} ${time}`;
}
