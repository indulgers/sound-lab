/**
 * 进阶包目录（前端展示用）。
 *
 * 价格以支付后端（GET /api/products）为准，这里只做展示；
 * 结账页会先向后端校验价格，下单只传 productId，金额由服务端决定。
 * 文案对应站内已有的进阶配方：市井专注（写作）、乡村夜晚（入夜）、午夜雷雨（雨夜）。
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
    price: '6.00',
    priceLabel: '¥6',
    desc: '解锁「市井专注」等进阶配方，专注时间更长。',
    sounds: ['market', 'muyu', 'chimes'],
  },
  {
    id: 'sleep-pack',
    name: '助眠包',
    price: '9.00',
    priceLabel: '¥9',
    desc: '解锁「乡村夜晚」等入夜配方，睡前慢慢听。',
    sounds: ['insects', 'train', 'harp', 'forest', 'boat'],
  },
  {
    id: 'rain-night-pack',
    name: '雨夜包',
    price: '12.00',
    priceLabel: '¥12',
    desc: '解锁「午夜雷雨」等雨夜配方，雨、雷、街道声全开。',
    sounds: ['thunder', 'rainstreet'],
  },
];

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
