/**
 * 进阶包目录（前端展示用）。
 *
 * 价格以支付后端（GET /api/products）为准，这里只做展示；
 * 结账页会先向后端校验价格，下单只传 productId，金额由服务端决定。
 * 文案对应站内已有的进阶配方：市井专注（写作）、乡村夜晚（入夜）、午夜雷雨（雨夜）。
 */
export const PACKS = [
  {
    id: 'focus-pack',
    name: '专注包',
    price: '6.00',
    priceLabel: '¥6',
    desc: '解锁「市井专注」等进阶配方，专注时间更长。',
  },
  {
    id: 'sleep-pack',
    name: '助眠包',
    price: '9.00',
    priceLabel: '¥9',
    desc: '解锁「乡村夜晚」等入夜配方，睡前慢慢听。',
  },
  {
    id: 'rain-night-pack',
    name: '雨夜包',
    price: '12.00',
    priceLabel: '¥12',
    desc: '解锁「午夜雷雨」等雨夜配方，雨、雷、街道声全开。',
  },
];

export function findPack(id) {
  return PACKS.find((pack) => pack.id === id) || null;
}
