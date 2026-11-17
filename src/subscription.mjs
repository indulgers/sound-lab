/**
 * 订阅模型（2026-11-16 定价确认：USD $7.99/月，年付 $79.90 = 月费 ×10；
 * 国内月卡 ¥18/月（30 天），年卡 ¥180/年 = 月费 ×10。
 * ¥58 占位价已被国内定价调研否决（国内竞品 ¥18–28/月：Tide ¥18、
 * 小睡眠 ¥24、蜗牛睡眠 ¥28、冥想星球 ~¥21，¥58 是主流价带的 2–3 倍）；
 * ¥18/¥180 是 limer 2026-11-16 确认的国内价（取主流价带下限）。
 * 国内用户更偏年付/一次性，CNY 展示时年卡在前；不设终身档。）
 *
 * 免费入口：清迈 + 巴厘岛两个目的地（的全部旅程）；其余 4 个目的地
 * （大叻——将被岘港替换、京都、里斯本、会安）属于订阅。
 * 订阅解锁：不限时收听、完整调音（全部通道 + 调参 + 保存配方）、
 * 睡眠定时。免费版：旅程 10 分钟窗口 + 基础调音（免费通道）。
 *
 * 本模块是前后端共用的纯逻辑：计划目录、免费目的地判定、
 * 订阅有效期判定。服务端定价以 server/products.ts 为准，
 * 这里的价格与它保持一致（测试会交叉校验）。
 */

export const SUBSCRIPTION_PLAN_IDS = ['subscription-monthly', 'subscription-yearly'];

/** 订阅计划目录（展示用；金额以服务端 /api/products 为准）。 */
export const SUBSCRIPTION_PLANS = [
  {
    id: 'subscription-monthly',
    plan: 'monthly',
    name: '订阅（月付）',
    nameEn: 'Subscription · Monthly',
    price: '18.00',
    priceLabel: '¥18',
    priceUsd: '7.99',
    priceLabelUsd: '$7.99',
    periodLabel: '每月',
    periodLabelEn: 'per month',
    durationDays: 30,
    desc: '按月订阅，随时取消。到期前 3 天会收到续费提醒。',
    descEn: 'Billed monthly. Cancel anytime; access runs to the end of the paid period.',
  },
  {
    id: 'subscription-yearly',
    plan: 'yearly',
    name: '订阅（年付）',
    nameEn: 'Subscription · Yearly',
    price: '180.00',
    priceLabel: '¥180',
    priceUsd: '79.90',
    priceLabelUsd: '$79.90',
    periodLabel: '每年',
    periodLabelEn: 'per year',
    durationDays: 365,
    desc: '按年订阅，等于白送两个月。随时取消，取消后用到期满。',
    descEn: 'Billed yearly — two months free. Cancel anytime; access runs to the end of the paid period.',
  },
];

/** 免费入口目的地（scene id）。大叻被岘港替换后，免费名单不变。 */
export const FREE_SCENES = ['chiang-mai', 'bali'];

/** 某个目的地（scene）是否免费开放。 */
export function isFreeScene(sceneId) {
  return FREE_SCENES.includes(String(sceneId || ''));
}

/** 某条旅程（journey，含 sceneId）是否免费开放。 */
export function isFreeJourney(journey) {
  return !!journey && isFreeScene(journey.sceneId);
}

export function findPlan(id) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) || null;
}

export function isSubscriptionProduct(productId) {
  return SUBSCRIPTION_PLAN_IDS.includes(String(productId || ''));
}

/** 某计划的有效期天数（月卡 30 天，年卡 365 天）。 */
export function planDurationDays(productId) {
  const plan = findPlan(productId);
  return plan ? plan.durationDays : 0;
}

/** 从付款时刻起算的到期时间（ms 时间戳）。 */
export function periodEndFrom(paidAtMs, productId) {
  const days = planDurationDays(productId);
  if (!days || !Number.isFinite(paidAtMs)) return null;
  return paidAtMs + days * 24 * 60 * 60 * 1000;
}

/**
 * 免费试用（limer 2026-11-16 确认）：只给海外（Waffo/USD）订阅开，
 * 7 天。国内支付宝月卡/年卡是一次性购买，不设试用。
 * 试用在创建 Waffo 产品时配 metadata.trialDays: 7（见
 * subscription-products-spec.md §A）；代码里 trialing 已算有效订阅。
 */
export const TRIAL_DAYS = 7;

/**
 * 按语言取计划的展示文案、按币种取价格——两者独立（2026-11-12 解耦规则）。
 * locale 只决定 name/desc 用中文还是英文；currency 只决定金额。
 * trialDays 跟币种走：USD（Waffo 订阅）7 天试用，CNY（支付宝月卡/
 * 年卡）0 天——一次性购买，不设试用。
 */
export function planDisplay(plan, locale, currency) {
  if (!plan) return null;
  const useEn = locale === 'en';
  const usd = currency === undefined || currency === null
    ? useEn
    : String(currency).trim().toUpperCase() === 'USD';
  return {
    name: useEn ? (plan.nameEn || plan.name) : plan.name,
    desc: useEn ? (plan.descEn || plan.desc) : plan.desc,
    price: usd ? plan.priceUsd : plan.price,
    priceLabel: usd ? plan.priceLabelUsd : plan.priceLabel,
    periodLabel: useEn ? (plan.periodLabelEn || plan.periodLabel) : plan.periodLabel,
    currency: usd ? 'USD' : 'CNY',
    durationDays: plan.durationDays,
    trialDays: usd ? TRIAL_DAYS : 0,
  };
}

/**
 * 订阅是否有效：状态在 trialing / active / past_due / canceling 且
 * 当前周期未结束。past_due（续费失败）当天保留访问，提示更新支付
 * 方式；canceling（已申请取消）保留访问到周期结束；canceled（已彻底
 * 结束）或周期已过则失效。currentPeriodEnd 是 ms 时间戳。
 */
export const SUBSCRIPTION_ACTIVE_STATUSES = ['trialing', 'active', 'past_due', 'canceling'];

export function isSubscriptionActive(subscription, nowMs = Date.now()) {
  if (!subscription || typeof subscription !== 'object') return false;
  if (!SUBSCRIPTION_ACTIVE_STATUSES.includes(subscription.status)) return false;
  const end = Number(subscription.currentPeriodEnd);
  if (!Number.isFinite(end)) return false;
  return end > nowMs;
}
