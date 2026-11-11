export const SOUNDS = [
  { id:"rain",    name:"雨",       en:"RAIN",       cat:"nature", color:"#5b8db8" },
  { id:"wind",    name:"风",       en:"WIND",       cat:"nature", color:"#8b9a8e" },
  { id:"waves",   name:"海浪",     en:"WAVES",      cat:"nature", color:"#4d9a94" },
  { id:"stream",  name:"溪流",     en:"STREAM",     cat:"nature", color:"#4fa3a5" },
  { id:"thunder", name:"雷",       en:"THUNDER",    cat:"nature", color:"#66707e", p:{bright:.22,dist:.55,density:.4} },
  { id:"birds",   name:"鸟鸣",     en:"BIRDS",      cat:"nature", color:"#7a9a52", p:{bright:.65} },
  { id:"insects", name:"虫鸣",     en:"INSECTS",    cat:"nature", color:"#8fae4c", p:{bright:.7,dist:.45} },
  { id:"fire",    name:"篝火",     en:"FIRE",       cat:"nature", color:"#d97e3f" },
  { id:"cafe",    name:"咖啡馆人声", en:"CAFÉ VOICES", cat:"city", color:"#a9743f" },
  { id:"traffic", name:"街道车流", en:"TRAFFIC",    cat:"city",   color:"#9c6b4f", p:{bright:.35,dist:.5} },
  { id:"train",   name:"夜行火车", en:"NIGHT TRAIN", cat:"city",  color:"#7a7264", p:{bright:.25,dist:.5} },
  { id:"rural",   name:"乡村夜晚", en:"RURAL NIGHT", cat:"city",  color:"#6f7f56", p:{bright:.3,dist:.45} },
  { id:"market",  name:"市场",     en:"MARKET",     cat:"city",   color:"#c08a3e" },
  { id:"rainstreet", name:"雨夜街道", en:"RAINY STREET", cat:"city", color:"#5b7fa6", p:{dist:.4} },
  { id:"piano",   name:"钢琴",     en:"PIANO",      cat:"inst",   color:"#a8894f" },
  { id:"guitar",  name:"吉他拨弦", en:"GUITAR",     cat:"inst",   color:"#b3854d" },
  { id:"chimes",  name:"风铃",     en:"WIND CHIMES", cat:"inst",  color:"#7fb3c8", p:{bright:.78,density:.45} },
  { id:"muyu",    name:"木鱼 / 手鼓", en:"WOODEN FISH & DRUM", cat:"inst", color:"#a05c3f", p:{density:.6,bright:.4} },
  { id:"harp",    name:"单音竖琴", en:"HARP NOTES", cat:"inst",   color:"#a58f5f", p:{bright:.6,density:.4} },
  { id:"forest", name:"森林", en:"FOREST", cat:"nature", color:"#769478", p:{bright:.7} },
  { id:"boat", name:"船舱", en:"BOAT CABIN", cat:"city", color:"#688e9b" },
  { id:"keyboard", name:"键盘轻敲", en:"KEYBOARD", cat:"city", color:"#b59477" }
];

export const RECIPES = [
  { name:"咖啡馆靠窗", tag:"写作", featured:true, intent:"写作", desc:"隔桌的谈话、键盘轻敲，偶尔有一两下吉他拨弦。", mix:{cafe:.62,keyboard:.38,guitar:.18} },
  { name:"雨夜独处", tag:"深度专注", featured:true, intent:"深度专注", desc:"窗外下着雨，远处的钢琴只留一点，适合埋头做一件事。", mix:{rain:.76,piano:.24,wind:.18} },
  { name:"篝火边", tag:"放松", featured:true, intent:"短暂放松", desc:"坐在火堆边。风很轻，木柴偶尔响一下。", mix:{fire:.75,wind:.24,piano:.16} },
  { name:"海边清晨", tag:"阅读", desc:"鸟刚醒，浪一层一层推上来，留几页书的时间。", mix:{waves:.70,birds:.35,wind:.24} },
  { name:"林间小屋", tag:"阅读", premium:true, desc:"雨落在树叶上，溪水从屋后流过。", mix:{rain:.32,forest:.65,stream:.24} },
  { name:"乡村夜晚", tag:"入夜", premium:true, desc:"虫鸣细碎，远处一班火车从田野边经过。", mix:{rural:.6,insects:.38,train:.29,rain:.26} },
  { name:"市井专注", tag:"写作", premium:true, desc:"市场人声在前，木鱼和手鼓轻轻打着拍子。", mix:{market:.53,muyu:.25,cafe:.32,rain:.22} },
  { name:"午夜雷雨", tag:"雨夜", premium:true, desc:"雨下得密，远处有雷，偶尔一辆车驶过积水。", mix:{thunder:.34,rain:.75,rainstreet:.43} },
  { name:"末班车窗边", tag:"放空", premium:true, desc:"车厢轻轻震动，雨从窗边经过，竖琴留在远处。", mix:{train:.72,rain:.42,harp:.26} },
  { name:"港湾来信", tag:"放空", premium:true, desc:"船舱随浪微晃，海风从身边吹过。", mix:{boat:.62,waves:.38,wind:.28} }
];
