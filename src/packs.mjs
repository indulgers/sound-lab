/**
 * 进阶包目录（前端展示用）。
 *
 * 价格以支付后端（GET /api/products）为准，这里只做展示；
 * 结账页会先向后端校验价格，下单只传 productId，金额由服务端决定。
 * 文案对应站内已有的进阶配方：市井专注（写作）、乡村夜晚（入夜）、午夜雷雨（雨夜）。
 *
 * 双币种：price / priceLabel 是 CNY（支付宝），priceUsd / priceLabelUsd
 * 是 USD（Waffo 海外版，2026-11-12 用户确认：$1.99 / $2.99 / $3.99）。
 * nameEn / descEn 是英文展示文案。包 ID 不变，权益跨支付渠道共用。
 *
 * sounds：这个包解锁的进阶通道（调音台里原来锁着的通道）。
 * 10 个进阶通道全部分配到了包里，一个配方能听，当且仅当它用到的
 * 每个进阶通道都被已拥有的包解锁：
 * - 专注包：市井专注（市场、木鱼/手鼓）+ 风铃
 * - 助眠包：乡村夜晚（虫鸣、夜行火车）、林间小屋（森林）、
 *   末班车窗边（夜行火车、单音竖琴）、港湾来信（船舱）
 * - 雨夜包：午夜雷雨（雷、雨夜街道）
 * 免费通道不在这里列（见 listening-session.mjs 的 FREE_SOUNDS）。
 */
export const PACKS = [
  {
    id: 'focus-pack',
    name: '专注包',
    nameEn: 'Focus Pack',
    price: '6.00',
    priceLabel: '¥6',
    priceUsd: '1.99',
    priceLabelUsd: '$1.99',
    desc: '解锁「市井专注」等进阶配方，专注时间更长。',
    descEn: 'Unlocks Plus recipes like “Street Focus” — stay focused for longer.',
    sounds: ['market', 'muyu', 'chimes'],
  },
  {
    id: 'sleep-pack',
    name: '助眠包',
    nameEn: 'Sleep Pack',
    price: '9.00',
    priceLabel: '¥9',
    priceUsd: '2.99',
    priceLabelUsd: '$2.99',
    desc: '解锁「乡村夜晚」等入夜配方，睡前慢慢听。',
    descEn: 'Unlocks night recipes like “Countryside Night” — drift off slowly.',
    sounds: ['insects', 'train', 'harp', 'forest', 'boat'],
  },
  {
    id: 'rain-night-pack',
    name: '雨夜包',
    nameEn: 'Rain Night Pack',
    price: '12.00',
    priceLabel: '¥12',
    priceUsd: '3.99',
    priceLabelUsd: '$3.99',
    desc: '解锁「午夜雷雨」等雨夜配方，雨、雷、街道声全开。',
    descEn: 'Unlocks rainy-night recipes like “Midnight Thunder” — rain, thunder and wet streets, all on.',
    sounds: ['thunder', 'rainstreet'],
  },
];

/**
 * 按语言取包的展示文案、按币种取价格——两者独立（2026-11-12 解耦规则）。
 * locale 只决定 name/desc 用中文还是英文；currency 只决定金额。
 * currency 省略时按旧行为从 locale 推导（en → USD，其他 → CNY），
 * 保持向后兼容；调用方应显式传支付地区的币种。
 */
export function packDisplay(pack, locale, currency) {
  if (!pack) return null;
  const useEn = locale === 'en';
  const usd = currency === undefined || currency === null
    ? useEn
    : String(currency).trim().toUpperCase() === 'USD';
  return {
    name: useEn ? (pack.nameEn || pack.name) : pack.name,
    desc: useEn ? (pack.descEn || pack.desc) : pack.desc,
    price: usd ? pack.priceUsd : pack.price,
    priceLabel: usd ? pack.priceLabelUsd : pack.priceLabel,
    currency: usd ? 'USD' : 'CNY',
  };
}

export function findPack(id) {
  return PACKS.find((pack) => pack.id === id) || null;
}

/** 一组包解锁的通道集合（Set<string>）。 */
export function soundsForPacks(packIds) {
  const sounds = new Set();
  for (const id of packIds || []) {
    const pack = findPack(id);
    if (pack) for (const sound of pack.sounds || []) sounds.add(sound);
  }
  return sounds;
}

/**
 * 一个配方（mix: { soundId: level }）能不能听：
 * mix 里音量 > 0.02 的每个通道都必须在 unlockedSoundIds 里
 * （调用方把免费通道 + 已拥有包的通道一起放进这个集合）。
 */
export function isMixUnlocked(mix, unlockedSoundIds) {
  return Object.entries(mix || {}).every(
    ([id, level]) => !(level > 0.02) || unlockedSoundIds.has(id),
  );
}
