/**
 * 界面语言（海外版 EN / 中文 ZH）切换。
 *
 * - 语言只决定文案，不决定货币和支付渠道（2026-11-12 用户明确规则：
 *   手动切换语言只改文案，支付方式和价格跟支付地区走，见 region.mjs）。
 * - P1：语言由 URL 前缀决定（/en/* 与 /zh/*）。getLocale() 优先读 URL
 *   前缀，其次 localStorage（手动选择仍持久化），最后浏览器语言。
 *   SSR 时 URL 前缀就是语言来源，因此服务端 head 可以按语言输出
 *   （修复了 P0 时代 SSR 标题无法本地化的限制）。
 * - 首次访问没有手动选择时，按浏览器语言自动判断：zh 开头（zh-CN、
 *   zh-TW、zh-HK 等）→ 中文，其他 → 英文。
 * - 手动切换存在 localStorage（键 sc-locale），优先于自动判断；
 *   切换后发 window 事件 soundcocktail:locale-changed，各组件用
 *   useLocale() 订阅，同步刷新。
 * - t(locale, key)：按点路径取字符串，缺失时回落到中文，再缺失返回 key 本身。
 */
import { createContext, useContext, useEffect, useState } from 'react';

/**
 * 语言 Context（P1）：根路由外壳按 URL 前缀提供当前语言
 * （/en/* → 'en'，/zh/* → 'zh'），子树里的 useLocale() 优先读它。
 * 这样 SSR 渲染的就是正确语言的文案（不靠水合后纠正），也不会
 * 出现服务端英文、客户端中文的水合不一致。没有 Provider 的页面
 * （/return、/waffo-return 等独立页）回落到 getLocale()。
 */
/** @type {import('react').Context<string | null>} */
export const LocaleContext = createContext(null);

export const LOCALE_KEY = 'sc-locale';
export const LOCALES = ['zh', 'en'];

/** 不带语言前缀的路径：支付回跳页与爬虫/健康检查端点。 */
export const BARE_PATHS = ['/return', '/waffo-return', '/health', '/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt'];

/**
 * 从路径取语言前缀：/en/focus → 'en'，/zh → 'zh'，/focus → null。
 * 纯函数，可在 node:test 里直接测。
 */
export function localeFromPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const m = pathname.match(/^\/(en|zh)(?:\/|$)/);
  return m ? m[1] : null;
}

/** 去掉语言前缀：/en/focus → /focus，/zh → /，/focus → /focus。 */
export function stripLocalePrefix(pathname) {
  const loc = localeFromPath(pathname);
  if (!loc) return pathname;
  const rest = pathname.slice(loc.length + 1);
  return rest === '' ? '/' : rest;
}

/** 给路径加上语言前缀：localizePath('/focus', 'zh') → '/zh/focus'。 */
export function localizePath(pathname, locale) {
  const loc = normalizeLocale(locale);
  const bare = stripLocalePrefix(pathname || '/');
  if (bare === '/') return `/${loc}`;
  return `/${loc}${bare}`;
}

/** 某路径是否应带语言前缀（支付回跳页与 /api/*、爬虫文件不带）。 */
export function isLocalizablePath(pathname) {
  const bare = stripLocalePrefix(pathname || '/');
  if (BARE_PATHS.includes(bare)) return false;
  if (bare.startsWith('/api/')) return false;
  return true;
}

export function normalizeLocale(value) {
  return value === 'en' ? 'en' : 'zh';
}

/**
 * 按浏览器语言自动判断界面语言：zh 开头 → 中文，其他 → 英文。
 * languages 优先取 navigator.languages 的第一项。
 */
export function detectUiLocale(languages) {
  const list = Array.isArray(languages)
    ? languages
    : languages
      ? [languages]
      : [];
  const first = list.find((lang) => lang !== undefined && lang !== null && String(lang).trim() !== '');
  if (first === undefined) return 'en';
  return String(first).trim().toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

/**
 * 当前界面语言：URL 前缀优先；其次手动选择（localStorage）；没有时按
 * 浏览器语言自动判断；SSR（无 window）且无 URL 前缀时默认英文
 * （站点默认语言；/ 是 308 到 /en 的重定向）。
 */
export function getLocale() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const fromPath = localeFromPath(window.location.pathname);
      if (fromPath) return fromPath;
    }
  } catch {
    // location 不可用时继续往下判断。
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if (stored === 'zh' || stored === 'en') return stored;
    }
  } catch {
    // localStorage 不可用时按浏览器语言判断。
  }
  try {
    if (typeof navigator !== 'undefined') {
      return detectUiLocale(navigator.languages || (navigator.language ? [navigator.language] : []));
    }
  } catch {
    // navigator 不可用时默认英文。
  }
  return 'en';
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

/**
 * 订阅语言变化的 React Hook（各组件直接用，不用经父组件传）。
 * 有 LocaleContext Provider 时以 Provider 的语言为准（SSR 与水合
 * 一致）；没有时回落到 getLocale()（URL 前缀 → localStorage → 浏览器语言）。
 * @returns {[string, (locale: string) => string]}
 */
export function useLocale() {
  const provided = useContext(LocaleContext);
  const [locale, setState] = useState(() => (provided ? normalizeLocale(provided) : getLocale()));
  useEffect(() => {
    setState(provided ? normalizeLocale(provided) : getLocale());
    function onChange(event) {
      setState(normalizeLocale(event?.detail?.locale ?? getLocale()));
    }
    window.addEventListener('soundcocktail:locale-changed', onChange);
    return () => window.removeEventListener('soundcocktail:locale-changed', onChange);
  }, [provided]);
  return [locale, setLocale];
}

export const STRINGS = {
  zh: {
    skipLink: '跳到正文',
    meta: {
      title: '声音疗愈 · Sound Cocktail',
      description: '以目的地为灵感的声音旅程：真实影像、原创音乐与可以调的声音层，留给专注、睡眠与冥想的时间。',
      ogDescription: '真实录音、乐器采样与实时合成。选一段旅程，调成你此刻需要的声音。',
    },
    audio: { cantPlay: '浏览器暂时无法播放声音' },
    nav: { recipes: '配方', plus: '进阶', mine: '我的配方', sources: '音源清单' },
    // 引擎睡眠定时到期的提示（sound-lab.mjs 用）。
    engine: {
      sleepDone: '本次定时聆听已结束。',
    },
    recipes: {
      title: '配方',
      en: 'recipes',
      sub: '按想做的事选一份配方。免费配方可以直接听，也可以继续调整。',
      enter: '进入场景',
      learnMore: '了解进阶',
      premiumTag: '进阶 · ',
    },
    plus: {
      title: 'Sound Cocktail 进阶',
      en: 'PLUS',
      sub: '免费听清迈与巴厘岛，订阅后去全部六个目的地、不限时收听。随时取消。',
      freeTitle: '免费',
      freeDesc: '清迈与巴厘岛两个目的地、10 分钟免费窗口、基础调音（12 种免费通道）。',
      buy: '订阅',
      goJourneys: '去听旅程',
      inProgress: '进行中',
      continuePay: '继续付款',
      yearlyTag: '白送两个月',
      trialNote: '7 天免费试用',
      unlocks: '解锁全部 6 个目的地、不限时收听、完整调音、保存配方与睡眠定时。',
      cancelNote: '随时取消，取消后用到期满。',
      refundNote: '首次订阅 7 天内全额退款。',
      current: '当前计划',
      currentPlan: '你的订阅：{plan}',
      renewsAuto: '将于 {date} 自动续费。',
      endsOn: '将于 {date} 到期，不会自动续费。',
      managePortal: '在 Waffo 客户中心管理',
      changePlanPortal: '在客户中心换计划',
      portalError: '打不开客户中心，请发邮件到 {email} 联系客服。',
    },
    mine: {
      title: '我的配方',
      en: 'my recipes',
      sub: '调到满意，给它起个名字存下来。还能生成一张配方卡发给朋友，或者把配方码发过去——对方粘贴进来，就能听到和你一模一样的一份配方。',
      saveTitle: '存下这份配方',
      saveDesc: '保存的是当前配比，随时回来一键复现。',
      saveEmpty: '当前配比：还没有调过任何声音。',
      currentMixPrefix: '当前配比：',
      nightSuffix: ' 之夜',
      apply: '播放这份配方',
      shareCard: '分享卡',
      copyCode: '复制配方码',
      delete: '删除',
      saveFirst: '先调几味声音，再保存这份配方',
      saved: '已保存「{name}」',
      savedNoStorage: '已保存到当前页面，浏览器存储不可用',
      deleted: '已删除「{name}」',
      codeCopied: '配方码已复制，发给朋友就能听到同款（连每味声音的参数一起）',
      copyFailed: '复制失败，请长按手动复制',
      pasteFirst: '先粘贴配方码',
      badCode: '这个配方码读不出来，检查一下有没有复制完整',
      friendRecipe: '朋友的配方',
      applied: '已播放「{name}」',
      appliedPlus: '已播放基础音效，配方中的进阶音效已保留',
      cardDone: '分享卡已生成，正在下载',
      shareTagline: '调一段属于自己的声音',
      importBadCode: '配方码无法识别，请检查后重新粘贴完整的配方码。',
      nameLabel: '配方名字',
      namePlaceholder: '例如：加班到深夜的那份',
      saveBtn: '保存配方',
      importTitle: '导入朋友的配方',
      importDesc: '把朋友发你的配方码粘贴到这里。',
      importLabel: '配方码',
      importPlaceholder: '粘贴以 SYL- 开头的配方码…',
      importBtn: '导入并播放这份配方',
      empty: '还没有存过配方。去旅程里调几味声音，调到「就是这个感觉」，再回来存下它。',
    },
    sources: {
      title: '音源清单',
      en: 'real recordings · sources & licences',
      sub: '查看录音和采样的作者与授权。可用本地文件替换基础通道，文件只在当前页面使用。',
      open: '查看音源与授权',
      close: '收起音源清单',
      bedNote: '底噪 · 可单独开关',
      badge: { synth: '实时合成', local: '本地录音', loading: '载入音源中', instrument: '乐器采样', live: '现场录音' },
      replace: '替换录音',
      plusSound: '进阶音效',
      editedBy: '编辑或提供',
      synthBy: '由 Sound Cocktail 实时合成',
      original: '原始录音：',
      replaced: '已替换「{name}」',
      loadFailed: '无法载入这段录音，请选择可播放的音频文件',
      bedWhite: '白噪音 床声',
      bedPink: '粉红噪音 床声',
      bedBrown: '褐色噪音 床声',
    },
    footer: { tagline: '声音疗愈 · 睡前、工作、雨夜', terms: '服务条款', privacy: '隐私政策', contact: '联系我们' },
    overlays: {
      sessionDoneTitle: '这 10 分钟结束了',
      sessionDoneSub: '这份配方还在。可以存下来，或再开一段体验。',
      again: '再听 10 分钟',
      save: '保存这份配方',
      learnPlus: '了解进阶',
      close: '关闭',
      premiumTitle: '进阶内容',
      back: '返回',
    },
    auth: {
      login: '登录',
      logout: '退出',
      registerTitle: '注册账号',
      loginTitle: '登录',
      registerSub: '注册后订阅会记在这个账号上，换设备登录也能继续听。',
      loginSub: '登录后，你的订阅会自动解锁。',
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
      back: '← 返回继续收听',
      product: '商品',
      price: '单价',
      quantity: '数量',
      total: '合计',
      method: '支付方式',
      alipay: '支付宝',
      waffo: '银行卡 / Apple Pay / Google Pay / 微信支付',
      note: '订阅是虚拟商品。支付宝月卡/年卡是一次性购买（30 天/365 天），到期不自动续费，买新卡即续费；付款后按订单开通，支付结果以支付宝回跳后的服务端确认为准。',
      noteWaffo: '订阅是虚拟商品。Waffo 订阅会自动续费，随时可在客户中心取消；付款后按订单开通，支付成功后会回到本站确认结果。',
      trialNoteWaffo: '海外订阅含 7 天免费试用：试用期内随时取消，不扣费；试用结束后自动续费。',
      needLoginTitle: '请先登录',
      needLoginDesc: '订阅需要登录账号，付款成功后订阅会记在你的账号上。',
      loginBtn: '登录 / 注册',
      notConfiguredTitle: '支付尚未开通配置',
      failedTitle: '下单失败',
      errorCode: '错误码：',
      formMissing: '支付表单返回异常，未找到可提交的表单。',
      httpStatus: '（HTTP {status}）',
      orderNo: '订单号：',
      payAlipay: '去支付宝付款',
      payWaffo: '去付款',
      creating: '正在创建订单…',
      redirecting: '正在跳转到支付宝…',
      openingCheckout: '收银台已在新标签页打开…',
      pendingTitle: '已有进行中的订单',
      pendingDesc: '这个计划已经有一笔未付款的订单，请继续完成它，不要重复下单。',
      continuePay: '继续付款',
      openedNote: '收银台已在新标签页打开。付款完成后会回到本站确认，订阅会记在你的账号上。',
      priceNoteMissing: '服务端商品目录里没有这个计划，以下为页面标价。',
      priceNoteUnverified: '未能从服务端校验价格，以下为页面标价；付款前请确认支付后端已启动。',
    },
    api: {
      connectFailed: '无法连接服务器，请检查网络后重试。',
      requestFailed: '请求失败。',
      requestFailedHttp: '请求失败（HTTP {status}）',
      productsFailed: '商品目录读取失败。',
      createFailed: '下单失败。',
      pendingFailed: '进行中订单读取失败。',
      orderStatusFailed: '订单状态查询失败。',
      payConnectFailed: '无法连接支付服务：{hint}。请确认支付后端已启动。',
      payHintLocal: '支付后端（同源 /api，由本站服务器路由提供）',
      payHintRemote: '支付后端 {base}',
    },
    landing: {
      presetLabel: '这页的配方',
      playMix: '播放这个配方',
      saveMix: '存下这个配方',
      faqTitle: '常见问题',
      moreTitle: '换个场景',
      backHome: '← 回到首页',
      otherPages: '更多场景',
    },
    nowPlaying: {
      playing: '正在播放',
      pause: '暂停',
      remaining: '还剩 {time}',
    },
    mix: {
      sharedMix: '朋友分享的一份配方',
      ingredients: '配料',
      openMix: '打开这份配方',
      invalidTitle: '这个配方码读不出来',
      invalidDesc: '可能是链接复制得不完整，或者配方里没有任何本站认识的声音。',
      backHome: '← 回到首页',
    },
  },
  en: {
    skipLink: 'Skip to content',
    meta: {
      title: 'Sound Therapy · Sound Cocktail',
      description: 'Place-inspired sound journeys: real film, original music and sound layers you can tune — for focus, sleep and meditation.',
      ogDescription: 'Live recordings, instrument samples and live synthesis. Pick a journey and tune it to the moment you are in.',
    },
    audio: { cantPlay: 'Your browser can’t play audio right now' },
    nav: { recipes: 'Recipes', plus: 'Plus', mine: 'My recipes', sources: 'Sources' },
    // The engine's sleep-timer expiry toast (sound-lab.mjs).
    engine: {
      sleepDone: 'Your sleep timer has ended.',
    },
    recipes: {
      title: 'Recipes',
      en: 'recipes',
      sub: 'Pick a recipe by what you want to do. Free recipes play right away and stay adjustable.',
      enter: 'Enter scene',
      learnMore: 'About Plus',
      premiumTag: 'Plus · ',
    },
    plus: {
      title: 'Sound Cocktail Plus',
      en: 'PLUS',
      sub: 'Listen to Chiang Mai and Bali for free. Subscribe for all six destinations and unlimited listening. Cancel anytime.',
      freeTitle: 'Free',
      freeDesc: 'Chiang Mai and Bali, a 10-minute free window, and the basic tuner (12 free sounds).',
      buy: 'Subscribe',
      goJourneys: 'Go to journeys',
      inProgress: 'Payment in progress',
      continuePay: 'Continue to payment',
      yearlyTag: 'Two months free',
      trialNote: '7-day free trial',
      unlocks: 'Unlocks all 6 destinations, unlimited listening, the full tuner, saved mixes and the sleep timer.',
      cancelNote: 'Cancel anytime. Access runs to the end of the paid period.',
      refundNote: 'Full refund within 7 days of your first subscription.',
      current: 'Current plan',
      currentPlan: 'Your subscription: {plan}',
      renewsAuto: 'Renews automatically on {date}.',
      endsOn: 'Ends on {date} — it does not renew automatically.',
      managePortal: 'Manage in Waffo portal',
      changePlanPortal: 'Change plan in portal',
      portalError: 'Could not open the portal — please email {email} for help.',
    },
    mine: {
      title: 'My recipes',
      en: 'my recipes',
      sub: 'When a mix feels right, give it a name and save it. You can also share a recipe card with a friend, or send them a recipe code — they paste it in and get exactly your mix.',
      saveTitle: 'Save this mix',
      saveDesc: 'Saves the current mix, ready to recall with one click.',
      saveEmpty: 'Current mix: no sound tuned yet.',
      currentMixPrefix: 'Current mix: ',
      nightSuffix: ' Night',
      apply: 'Play this mix',
      shareCard: 'Share card',
      copyCode: 'Copy recipe code',
      delete: 'Delete',
      saveFirst: 'Tune a few sounds first, then save this mix',
      saved: 'Saved “{name}”',
      savedNoStorage: 'Saved on this page — browser storage is unavailable',
      deleted: 'Deleted “{name}”',
      codeCopied: 'Recipe code copied — send it to a friend and they can hear the exact same mix, tuning included',
      copyFailed: 'Copy failed — long-press to copy manually',
      pasteFirst: 'Paste a recipe code first',
      badCode: 'That recipe code doesn’t read — check it was copied in full',
      friendRecipe: 'A friend’s recipe',
      applied: 'Playing “{name}”',
      appliedPlus: 'Playing the free sounds — the Plus sounds in this recipe are kept',
      cardDone: 'Share card made — downloading now',
      shareTagline: 'Tune a sound of your own',
      importBadCode: 'That recipe code doesn’t read — check it and paste the full code again.',
      nameLabel: 'Recipe name',
      namePlaceholder: 'e.g. The one for late-night overtime',
      saveBtn: 'Save recipe',
      importTitle: 'Import a friend’s recipe',
      importDesc: 'Paste the recipe code your friend sent you.',
      importLabel: 'Recipe code',
      importPlaceholder: 'Paste a code starting with SYL-…',
      importBtn: 'Import and play this mix',
      empty: 'No saved recipes yet. Tune a few sounds in a journey until it feels right, then come back and save it.',
    },
    sources: {
      title: 'Sources',
      en: 'real recordings · sources & licences',
      sub: 'See who recorded and sampled each sound, and under which licence. You can replace base channels with local files — they stay on this page only.',
      open: 'View sources & licences',
      close: 'Hide sources',
      bedNote: 'Noise beds · toggle individually',
      badge: { synth: 'Synthesized live', local: 'Local recording', loading: 'Loading audio…', instrument: 'Instrument sample', live: 'Live recording' },
      replace: 'Replace recording',
      plusSound: 'Plus sound',
      editedBy: 'edited or provided',
      synthBy: 'Synthesized live by Sound Cocktail',
      original: 'Original recording: ',
      replaced: 'Replaced “{name}”',
      loadFailed: 'Couldn’t load that recording — pick a playable audio file',
      bedWhite: 'White noise bed',
      bedPink: 'Pink noise bed',
      bedBrown: 'Brown noise bed',
    },
    footer: { tagline: 'Sound therapy · bedtime, work, rainy nights', terms: 'Terms of Service', privacy: 'Privacy Policy', contact: 'Contact us' },
    overlays: {
      sessionDoneTitle: 'These 10 minutes are up',
      sessionDoneSub: 'Your mix is still here. Save it, or start another session.',
      again: 'Another 10 minutes',
      save: 'Save this mix',
      learnPlus: 'About Plus',
      close: 'Close',
      premiumTitle: 'Plus content',
      back: 'Back',
    },
    auth: {
      login: 'Sign in',
      logout: 'Sign out',
      registerTitle: 'Create an account',
      loginTitle: 'Sign in',
      registerSub: 'Your subscription is kept on this account, so it follows you to any device.',
      loginSub: 'Sign in and your subscription unlocks automatically.',
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
      back: '← Back to listening',
      product: 'Product',
      price: 'Price',
      quantity: 'Quantity',
      total: 'Total',
      method: 'Payment method',
      alipay: 'Alipay',
      waffo: 'Card / Apple Pay / Google Pay / WeChat Pay',
      note: 'A subscription is a digital product. The Alipay monthly/yearly card is a one-time purchase (30 days / 365 days) that does not renew automatically — buy a new card to renew. It unlocks on your order after payment; the result is confirmed server-side after returning from Alipay.',
      noteWaffo: 'A subscription is a digital product. A Waffo subscription renews automatically and can be cancelled anytime in the customer portal. It unlocks on your order after payment; you will come back here to confirm the result.',
      trialNoteWaffo: 'Includes a 7-day free trial: cancel anytime during the trial and you won’t be charged; the subscription renews automatically after the trial.',
      needLoginTitle: 'Please sign in first',
      needLoginDesc: 'Subscribing needs an account, so the subscription is recorded on you after payment.',
      loginBtn: 'Sign in / Create account',
      notConfiguredTitle: 'Payment is not configured yet',
      failedTitle: 'Could not create the order',
      errorCode: 'Error code: ',
      formMissing: 'The payment form came back wrong — no submittable form was found.',
      httpStatus: '(HTTP {status})',
      orderNo: 'Order: ',
      payAlipay: 'Pay with Alipay',
      payWaffo: 'Continue to payment',
      creating: 'Creating order…',
      redirecting: 'Going to Alipay…',
      openingCheckout: 'Checkout opened in a new tab…',
      pendingTitle: 'You already have an order in progress',
      pendingDesc: 'There is already an unpaid order for this plan. Please continue with it instead of paying twice.',
      continuePay: 'Continue to payment',
      openedNote: 'Checkout opened in a new tab. After paying you will come back here to confirm, and the subscription will be on your account.',
      priceNoteMissing: 'This plan is not in the server catalog; showing the page price.',
      priceNoteUnverified: 'Could not verify the price with the server; showing the page price. Please make sure the payment backend is running before paying.',
    },
    api: {
      connectFailed: 'Can’t reach the server. Check your connection and try again.',
      requestFailed: 'Request failed.',
      requestFailedHttp: 'Request failed (HTTP {status})',
      productsFailed: 'Couldn’t load the product list.',
      createFailed: 'Couldn’t create the order.',
      pendingFailed: 'Couldn’t load the in-progress order.',
      orderStatusFailed: 'Couldn’t check the order status.',
      payConnectFailed: 'Can’t reach the payment service: {hint}. Make sure the payment backend is running.',
      payHintLocal: 'payment backend (same-origin /api, served by this site’s server routes)',
      payHintRemote: 'payment backend {base}',
    },
    landing: {
      presetLabel: 'This page’s recipe',
      playMix: 'Play this recipe',
      saveMix: 'Save this recipe',
      faqTitle: 'Frequently asked questions',
      moreTitle: 'Try another scene',
      backHome: '← Back to home',
      otherPages: 'More scenes',
    },
    nowPlaying: {
      playing: 'Now playing',
      pause: 'Pause',
      remaining: '{time} left',
    },
    mix: {
      sharedMix: 'A mix a friend shared',
      ingredients: 'Ingredients',
      openMix: 'Open this mix',
      invalidTitle: 'That recipe code doesn’t read',
      invalidDesc: 'The link may have been copied incompletely, or the recipe has no sounds this site knows.',
      backHome: '← Back home',
    },
  },
};

/** 按点路径取文案：t('en', 'nav.recipes')。缺失时回落中文，再缺失返回 key。
 * replacements：把 {name} 这类占位换成实际值，如 t(locale, 'mine.saved', { name })。 */
export function t(locale, key, replacements) {
  const lang = normalizeLocale(locale);
  const parts = String(key).split('.');
  let node = STRINGS[lang];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) node = node[part];
    else { node = undefined; break; }
  }
  let result = typeof node === 'string' ? node : undefined;
  if (result === undefined) {
    let fallback = STRINGS.zh;
    for (const part of parts) {
      if (fallback && typeof fallback === 'object' && part in fallback) fallback = fallback[part];
      else { fallback = undefined; break; }
    }
    result = typeof fallback === 'string' ? fallback : key;
  }
  if (replacements) {
    for (const [name, value] of Object.entries(replacements)) {
      result = result.split(`{${name}}`).join(String(value));
    }
  }
  return result;
}

/**
 * 服务端按错误码返回的中文 message，在英文界面按码换成本地文案
 * （码是接口契约，文案不是）。没有对应码时 apiErrorMessage 返回 null，
 * 调用方保留服务端原消息。
 */
export const API_ERROR_MESSAGES = {
  zh: {
    INVALID_EMAIL: '邮箱格式不正确。',
    WEAK_PASSWORD: '密码至少 8 位。',
    EMAIL_TAKEN: '这个邮箱已经注册过了，请直接登录。',
    TOO_MANY_ATTEMPTS: '尝试次数太多，请 1 小时后再试。',
    INVALID_CREDENTIALS: '邮箱或密码不对，请再试一次。',
    PAYMENT_NOT_CONFIGURED: '支付未配置：缺少支付宝沙箱/生产配置，请先完成沙箱配置。',
    PAYMENT_CONFIG_INVALID: '支付配置有误，请检查配置后重试。',
    STORE_NOT_CONFIGURED: '订单存储未配置：缺少 ORDERS_KV 绑定。',
    WAFFO_NOT_CONFIGURED: '海外支付未配置。',
  },
  en: {
    INVALID_EMAIL: 'That email address doesn’t look right.',
    WEAK_PASSWORD: 'Your password needs at least 8 characters.',
    EMAIL_TAKEN: 'This email is already registered — please sign in.',
    TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again in an hour.',
    INVALID_CREDENTIALS: 'Wrong email or password. Please try again.',
    PAYMENT_NOT_CONFIGURED: 'Payment is not configured: the Alipay sandbox/production setup is missing.',
    PAYMENT_CONFIG_INVALID: 'The payment configuration is invalid. Please check it and try again.',
    STORE_NOT_CONFIGURED: 'Order storage is not configured: the ORDERS_KV binding is missing.',
    WAFFO_NOT_CONFIGURED: 'Overseas payment is not configured.',
  },
};

/** 按服务端错误码取本地文案；没有对应码时返回 null。 */
export function apiErrorMessage(code, locale) {
  if (!code) return null;
  const table = API_ERROR_MESSAGES[normalizeLocale(locale)] || API_ERROR_MESSAGES.en;
  return typeof table[code] === 'string' ? table[code] : null;
}
