/**
 * 语言（海外版 EN / 中文 ZH）切换。
 *
 * - 语言存在 localStorage（键 sc-locale），默认中文；切换后发
 *   window 事件 soundcocktail:locale-changed，各组件用 useLocale()
 *   订阅，同步刷新。
 * - SSR 时读不到 localStorage，默认中文；水合后按本地存储纠正。
 * - t(locale, key)：按点路径取字符串，缺失时回落到中文，再缺失返回 key 本身。
 * - 语言决定三件事：界面文案、货币展示、支付渠道（中文→支付宝 CNY，
 *   英文→Waffo USD）。包 ID 不变，权益跨渠道共用。
 */
import { useEffect, useState } from 'react';

export const LOCALE_KEY = 'sc-locale';
export const LOCALES = ['zh', 'en'];

export function normalizeLocale(value) {
  return value === 'en' ? 'en' : 'zh';
}

export function getLocale() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return normalizeLocale(window.localStorage.getItem(LOCALE_KEY));
    }
  } catch {
    // localStorage 不可用时默认中文。
  }
  return 'zh';
}

export function setLocale(locale) {
  const next = normalizeLocale(locale);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCALE_KEY, next);
    }
  } catch {
    // 忽略写入失败。
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('soundcocktail:locale-changed', { detail: { locale: next } }));
  }
  return next;
}

/** 订阅语言变化的 React Hook（各组件直接用，不用经父组件传）。 */
export function useLocale() {
  const [locale, setState] = useState(() => getLocale());
  useEffect(() => {
    setState(getLocale());
    function onChange(event) {
      setState(normalizeLocale(event?.detail?.locale ?? getLocale()));
    }
    window.addEventListener('soundcocktail:locale-changed', onChange);
    return () => window.removeEventListener('soundcocktail:locale-changed', onChange);
  }, []);
  return [locale, setLocale];
}

export const STRINGS = {
  zh: {
    skipLink: '跳到调音台',
    nav: { mixer: '调音台', recipes: '配方', plus: '进阶', mine: '我的配方', sources: '音源清单' },
    hero: {
      title: '调一杯声音',
      lead: '选个场景，留十分钟给手上的事。隔壁桌低声聊天，雨落在窗上，想听哪种声音多一点，随时回来调。',
      freeNote: '免费场景 · 每次最多 10 分钟',
      ctaPlay: '▶ 自己调一杯',
      ctaImmersive: '沉浸模式',
      ctaAll: '查看全部配方',
      featuredLabel: '选择一个免费场景',
    },
    mixer: {
      title: '调音台',
      en: 'the mixing board',
      sub: '拉动推子叠加声音，打开「调音参数」调亮度、距离和节奏。乐器采样还能调音符的疏密与随机度。',
      master: '总音量 MASTER',
      remaining: '本次剩余 · 免费体验',
      immersive: '进入沉浸模式',
      random: '随机一杯',
      clear: '全部归零',
      comfort: '首次播放开始计时。暂停或切换配方后，倒计时继续。',
      filterAll: '全部',
      filterActive: '正在调配',
      filterNature: '自然',
      filterCity: '场所',
      filterInst: '乐器',
      emptyFilter: '当前杯子为空。切到「全部」添加声音。',
    },
    recipes: {
      title: '配方',
      en: 'recipes',
      sub: '按想做的事选一杯。免费配方可以直接听，也可以继续调整。',
      enter: '进入场景',
      learnMore: '了解进阶',
      premiumTag: '进阶 · ',
    },
    plus: {
      title: 'Sound Cocktail 进阶',
      en: 'PLUS',
      sub: '想把一杯声音留得久一些，或去更远的地方听一听。一次购买，长期使用。',
      freeTitle: '免费',
      freeDesc: '4 款场景配方、12 种基础音效、3 种底噪。每次播放最多 10 分钟。',
      buy: '购买',
      owned: '已拥有',
      goMixer: '去调音',
      once: '/ 一次性',
      inProgress: '进行中',
      continuePay: '继续付款',
    },
    mine: {
      title: '我的配方',
      en: 'my recipes',
      sub: '调到满意，给它起个名字存下来。还能生成一张配方卡发给朋友，或者把配方码发过去——对方粘贴进来，就能调出和你一模一样的一杯。',
      saveTitle: '存下这一杯',
      saveDesc: '保存的是当前推子的配比，随时回来一键复现。',
      saveEmpty: '当前配比：还没有拉动任何推子。',
      nameLabel: '配方名字',
      namePlaceholder: '例如：加班到深夜的那杯',
      saveBtn: '保存配方',
      importTitle: '导入朋友的配方',
      importDesc: '把朋友发你的配方码粘贴到这里。',
      importLabel: '配方码',
      importPlaceholder: '粘贴以 SYL- 开头的配方码…',
      importBtn: '导入并调出这杯',
      empty: '还没有存过配方。去调音台拉几格推子，调到「就是这个感觉」，再回来存下它。',
    },
    sources: {
      title: '音源清单',
      en: 'real recordings · sources & licences',
      sub: '查看录音和采样的作者与授权。可用本地文件替换基础通道，文件只在当前页面使用。',
      open: '查看音源与授权',
      close: '收起音源清单',
      bedNote: '底噪 · 可单独开关',
    },
    footer: { tagline: '自己调一杯声音 · 睡前、工作、雨夜' },
    overlays: {
      sessionDoneTitle: '这 10 分钟结束了',
      sessionDoneSub: '这杯还在。可以存下来，或再开一段体验。',
      again: '再听 10 分钟',
      save: '保存这杯',
      learnPlus: '了解进阶',
      close: '关闭',
      premiumTitle: '进阶内容',
      backToMixer: '回调音台',
      immTitle: '今晚这一杯',
      immSub: '留一点时间给手上的事。',
      immPause: '暂停',
      immResume: '继续播放',
      immExit: '回调音台',
    },
    auth: {
      login: '登录',
      logout: '退出',
      registerTitle: '注册账号',
      loginTitle: '登录',
      registerSub: '注册后购买的包会记在这个账号上，换设备登录也能继续听。',
      loginSub: '登录后，已购买的包会自动解锁。',
      email: '邮箱',
      password: '密码',
      passwordRegisterPlaceholder: '至少 8 位',
      passwordLoginPlaceholder: '你的密码',
      submitRegister: '注册并登录',
      submitLogin: '登录',
      busy: '请稍等…',
      cancel: '取消',
      or: '或',
      google: '使用 Google 登录',
      hasAccount: '已有账号？',
      goLogin: '直接登录',
      noAccount: '还没有账号？',
      goRegister: '注册一个',
      failed: '登录失败，请再试一次。',
    },
    checkout: {
      title: '结账',
      en: 'checkout',
      noProductTitle: '没有这个商品',
      noProductDesc: '链接里的商品不存在，可能是地址写错了。',
      back: '← 返回继续调音',
      onceTag: '一次性买断',
      product: '商品',
      price: '单价',
      quantity: '数量',
      total: '合计',
      method: '支付方式',
      alipay: '支付宝',
      waffo: '银行卡 / Apple Pay / Google Pay / 微信支付',
      note: '虚拟商品，一次购买。付款后按订单开通；支付结果以支付宝回跳后的服务端确认为准。',
      noteWaffo: '虚拟商品，一次购买。付款后按订单开通；支付成功后会回到本站确认结果。',
      needLoginTitle: '请先登录',
      needLoginDesc: '购买需要登录账号，付款成功后包会记在你的账号上。',
      loginBtn: '登录 / 注册',
      notConfiguredTitle: '支付尚未开通配置',
      failedTitle: '下单失败',
      errorCode: '错误码：',
      orderNo: '订单号：',
      payAlipay: '去支付宝付款',
      payWaffo: '去付款',
      creating: '正在创建订单…',
      redirecting: '正在跳转到支付宝…',
      openingCheckout: '收银台已在新标签页打开…',
      pendingTitle: '已有进行中的订单',
      pendingDesc: '这个包已经有一笔未付款的订单，请继续完成它，不要重复下单。',
      continuePay: '继续付款',
      openedNote: '收银台已在新标签页打开。付款完成后会回到本站确认，包会记在你的账号上。',
      priceNoteMissing: '服务端商品目录里没有这个包，以下为页面标价。',
      priceNoteUnverified: '未能从服务端校验价格，以下为页面标价；付款前请确认支付后端已启动。',
    },
  },
  en: {
    skipLink: 'Skip to the mixer',
    nav: { mixer: 'Mixer', recipes: 'Recipes', plus: 'Plus', mine: 'My recipes', sources: 'Sources' },
    hero: {
      title: 'Mix a cup of sound',
      lead: 'Pick a scene and keep ten minutes for the thing in front of you. Low voices at the next table, rain on the window — turn up whatever you want more of, whenever you like.',
      freeNote: 'Free scenes · up to 10 minutes each',
      ctaPlay: '▶ Mix my own',
      ctaImmersive: 'Immersive mode',
      ctaAll: 'See all recipes',
      featuredLabel: 'Choose a free scene',
    },
    mixer: {
      title: 'Mixer',
      en: 'the mixing board',
      sub: 'Slide the faders to layer sounds, open “Tuning” to adjust brightness, distance and rhythm. Instrument samples can also tune note density and randomness.',
      master: 'Master volume',
      remaining: 'Left this time · free trial',
      immersive: 'Enter immersive mode',
      random: 'Surprise me',
      clear: 'Reset all',
      comfort: 'The timer starts on first play. It keeps running when you pause or switch recipes.',
      filterAll: 'All',
      filterActive: 'In the mix',
      filterNature: 'Nature',
      filterCity: 'Places',
      filterInst: 'Instruments',
      emptyFilter: 'This cup is empty. Switch to “All” to add sounds.',
    },
    recipes: {
      title: 'Recipes',
      en: 'recipes',
      sub: 'Pick a cup by what you want to do. Free recipes play right away and stay adjustable.',
      enter: 'Enter scene',
      learnMore: 'About Plus',
      premiumTag: 'Plus · ',
    },
    plus: {
      title: 'Sound Cocktail Plus',
      en: 'PLUS',
      sub: 'Keep a cup for longer, or take it further away. Buy once, keep it.',
      freeTitle: 'Free',
      freeDesc: '4 scene recipes, 12 base sounds, 3 noise beds. Up to 10 minutes per session.',
      buy: 'Buy',
      owned: 'Owned',
      goMixer: 'Go to mixer',
      once: '/ one-time',
      inProgress: 'Payment in progress',
      continuePay: 'Continue to payment',
    },
    mine: {
      title: 'My recipes',
      en: 'my recipes',
      sub: 'When a mix feels right, give it a name and save it. You can also share a recipe card with a friend, or send them a recipe code — they paste it in and get exactly your cup.',
      saveTitle: 'Save this cup',
      saveDesc: 'Saves the current fader mix, ready to recall with one click.',
      saveEmpty: 'Current mix: no fader moved yet.',
      nameLabel: 'Recipe name',
      namePlaceholder: 'e.g. The one for late-night overtime',
      saveBtn: 'Save recipe',
      importTitle: 'Import a friend’s recipe',
      importDesc: 'Paste the recipe code your friend sent you.',
      importLabel: 'Recipe code',
      importPlaceholder: 'Paste a code starting with SYL-…',
      importBtn: 'Import and mix this cup',
      empty: 'No saved recipes yet. Move a few faders until it feels right, then come back and save it.',
    },
    sources: {
      title: 'Sources',
      en: 'real recordings · sources & licences',
      sub: 'See who recorded and sampled each sound, and under which licence. You can replace base channels with local files — they stay on this page only.',
      open: 'View sources & licences',
      close: 'Hide sources',
      bedNote: 'Noise beds · toggle individually',
    },
    footer: { tagline: 'Mix your own cup of sound · bedtime, work, rainy nights' },
    overlays: {
      sessionDoneTitle: 'These 10 minutes are up',
      sessionDoneSub: 'Your cup is still here. Save it, or start another session.',
      again: 'Another 10 minutes',
      save: 'Save this cup',
      learnPlus: 'About Plus',
      close: 'Close',
      premiumTitle: 'Plus content',
      backToMixer: 'Back to mixer',
      immTitle: 'Tonight’s cup',
      immSub: 'Keep a little time for the thing in front of you.',
      immPause: 'Pause',
      immResume: 'Resume',
      immExit: 'Back to mixer',
    },
    auth: {
      login: 'Sign in',
      logout: 'Sign out',
      registerTitle: 'Create an account',
      loginTitle: 'Sign in',
      registerSub: 'Purchases are kept on this account, so they follow you to any device.',
      loginSub: 'Sign in and your purchased packs unlock automatically.',
      email: 'Email',
      password: 'Password',
      passwordRegisterPlaceholder: 'At least 8 characters',
      passwordLoginPlaceholder: 'Your password',
      submitRegister: 'Create account & sign in',
      submitLogin: 'Sign in',
      busy: 'One moment…',
      cancel: 'Cancel',
      or: 'or',
      google: 'Continue with Google',
      hasAccount: 'Already have an account?',
      goLogin: 'Sign in',
      noAccount: 'No account yet?',
      goRegister: 'Create one',
      failed: 'Sign-in failed. Please try again.',
    },
    checkout: {
      title: 'Checkout',
      en: 'checkout',
      noProductTitle: 'No such product',
      noProductDesc: 'The product in this link does not exist — the address may be wrong.',
      back: '← Back to the mixer',
      onceTag: 'One-time purchase',
      product: 'Product',
      price: 'Price',
      quantity: 'Quantity',
      total: 'Total',
      method: 'Payment method',
      alipay: 'Alipay',
      waffo: 'Card / Apple Pay / Google Pay / WeChat Pay',
      note: 'Digital product, buy once. It unlocks on your order after payment; the result is confirmed server-side after returning from Alipay.',
      noteWaffo: 'Digital product, buy once. It unlocks on your order after payment; you will come back here to confirm the result.',
      needLoginTitle: 'Please sign in first',
      needLoginDesc: 'Buying needs an account, so the pack is recorded on you after payment.',
      loginBtn: 'Sign in / Create account',
      notConfiguredTitle: 'Payment is not configured yet',
      failedTitle: 'Could not create the order',
      errorCode: 'Error code: ',
      orderNo: 'Order: ',
      payAlipay: 'Pay with Alipay',
      payWaffo: 'Continue to payment',
      creating: 'Creating order…',
      redirecting: 'Going to Alipay…',
      openingCheckout: 'Checkout opened in a new tab…',
      pendingTitle: 'You already have an order in progress',
      pendingDesc: 'There is already an unpaid order for this pack. Please continue with it instead of paying twice.',
      continuePay: 'Continue to payment',
      openedNote: 'Checkout opened in a new tab. After paying you will come back here to confirm, and the pack will be on your account.',
      priceNoteMissing: 'This pack is not in the server catalog; showing the page price.',
      priceNoteUnverified: 'Could not verify the price with the server; showing the page price. Please make sure the payment backend is running before paying.',
    },
  },
};

/** 按点路径取文案：t('en', 'nav.mixer')。缺失时回落中文，再缺失返回 key。 */
export function t(locale, key) {
  const lang = normalizeLocale(locale);
  const parts = String(key).split('.');
  let node = STRINGS[lang];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else { node = undefined; break; }
  }
  if (typeof node === 'string') return node;
  let fallback = STRINGS.zh;
  for (const part of parts) {
    if (fallback && typeof fallback === 'object' && part in fallback) fallback = fallback[part];
    else { fallback = undefined; break; }
  }
  return typeof fallback === 'string' ? fallback : key;
}
