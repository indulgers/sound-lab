/**
 * 界面语言（海外版 EN / 中文 ZH）切换。
 *
 * - 语言只决定文案，不决定货币和支付渠道（2026-11-12 用户明确规则：
 *   手动切换语言只改文案，支付方式和价格跟支付地区走，见 region.mjs）。
 * - 首次访问没有手动选择时，按浏览器语言自动判断：zh 开头（zh-CN、
 *   zh-TW、zh-HK 等）→ 中文，其他 → 英文。
 * - 手动切换存在 localStorage（键 sc-locale），优先于自动判断；
 *   切换后发 window 事件 soundcocktail:locale-changed，各组件用
 *   useLocale() 订阅，同步刷新。
 * - SSR 时读不到 localStorage 和 navigator，默认中文；水合后按本地
 *   存储或浏览器语言纠正。
 * - t(locale, key)：按点路径取字符串，缺失时回落到中文，再缺失返回 key 本身。
 */
import { useEffect, useState } from 'react';

export const LOCALE_KEY = 'sc-locale';
export const LOCALES = ['zh', 'en'];

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
 * 当前界面语言：手动选择（localStorage）优先；没有时按浏览器语言
 * 自动判断；SSR（无 window）时默认中文。
 */
export function getLocale() {
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
    // navigator 不可用时默认中文。
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
    meta: {
      title: '调一杯声音',
      description: '混合 22 种声音，听雨落在车窗上，听咖啡馆里的轻声谈话。调成一杯保存，留给专注或放空的时间。',
      ogDescription: '现场录音、乐器采样与实时合成。选几种声音，调一杯自己的声景。',
    },
    cup: {
      svgAria: '随配比变化的手绘涂鸦鸡尾酒杯',
      empty: '拉一格推子，开始调配',
      hint: '轻拖杯子，晃一晃',
      emptyCap: '这杯还空着',
      more: ' 等 {total} 种',
    },
    audio: { cantPlay: '浏览器暂时无法播放声音' },
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
      master: '总音量',
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
      group: { nature: '自然', city: '场所', inst: '乐器' },
      groupCount: '{n} 种 · 点「调音参数」细调每种音色',
      tuning: '调音参数',
      tuningPlus: '了解进阶音效',
      faderPlus: '进阶',
      faderMuted: '静音',
      faderVolume: '音量',
      playPauseAria: '播放或暂停',
      playAria: '播放',
      pauseAria: '暂停',
      masterAria: '总音量（舒适上限 85）',
      filtersAria: '筛选音源',
      playingCta: '⏸ 暂停这一杯',
      cleared: '全部归零，安静了',
      randomToast: '随机一杯：{names}',
      param: { density: '密度', bright: '明亮度', dist: '远近', rand: '随机度', tempo: '节奏' },
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
      currentMixPrefix: '当前配比：',
      nightSuffix: ' 之夜',
      apply: '调出这杯',
      shareCard: '分享卡',
      copyCode: '复制配方码',
      delete: '删除',
      saveFirst: '先拉几格推子，再保存这一杯',
      saved: '已保存「{name}」',
      savedNoStorage: '已保存到当前页面，浏览器存储不可用',
      deleted: '已删除「{name}」',
      codeCopied: '配方码已复制，发给朋友就能调出同款（连每味原料的参数一起）',
      copyFailed: '复制失败，请长按手动复制',
      pasteFirst: '先粘贴配方码',
      badCode: '这个配方码读不出来，检查一下有没有复制完整',
      friendRecipe: '朋友的配方',
      applied: '已调出「{name}」',
      appliedPlus: '已调出基础音效，配方中的进阶音效已保留',
      cardDone: '分享卡已生成，正在下载',
      shareTagline: '自己调一杯声音',
      importBadCode: '配方码无法识别，请检查后重新粘贴完整的配方码。',
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
      premiumMsg: '「{name}」属于进阶内容。进阶版正在筹备中。',
      immRemainingAria: '本次体验剩余时间',
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
      formMissing: '支付表单返回异常，未找到可提交的表单。',
      httpStatus: '（HTTP {status}）',
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
  },
  en: {
    skipLink: 'Skip to the mixer',
    meta: {
      title: 'Mix a cup of sound',
      description: 'Mix 22 sounds — rain on the car window, low talk in a café. Save your cup for focused or empty time.',
      ogDescription: 'Live recordings, instrument samples and live synthesis. Pick a few sounds and mix a soundscape of your own.',
    },
    cup: {
      svgAria: 'Hand-drawn doodle cocktail glass that changes with the mix',
      empty: 'Move a fader to start mixing',
      hint: 'Drag the cup gently, give it a swirl',
      emptyCap: 'This cup is still empty',
      more: ' + {extra} more',
    },
    audio: { cantPlay: 'Your browser can’t play audio right now' },
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
      group: { nature: 'Nature', city: 'Places', inst: 'Instruments' },
      groupCount: '{n} sounds · open “Tuning” to fine-tune each one',
      tuning: 'Tuning',
      tuningPlus: 'About Plus sounds',
      faderPlus: 'Plus',
      faderMuted: 'Muted',
      faderVolume: 'Volume',
      playPauseAria: 'Play or pause',
      playAria: 'Play',
      pauseAria: 'Pause',
      masterAria: 'Master volume (comfortable limit 85)',
      filtersAria: 'Filter sounds',
      playingCta: '⏸ Pause this cup',
      cleared: 'All reset — quiet now',
      randomToast: 'Surprise cup: {names}',
      param: { density: 'Density', bright: 'Brightness', dist: 'Distance', rand: 'Randomness', tempo: 'Tempo' },
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
      currentMixPrefix: 'Current mix: ',
      nightSuffix: ' Night',
      apply: 'Mix this cup',
      shareCard: 'Share card',
      copyCode: 'Copy recipe code',
      delete: 'Delete',
      saveFirst: 'Move a few faders first, then save this cup',
      saved: 'Saved “{name}”',
      savedNoStorage: 'Saved on this page — browser storage is unavailable',
      deleted: 'Deleted “{name}”',
      codeCopied: 'Recipe code copied — send it to a friend and they can mix the exact same cup, tuning included',
      copyFailed: 'Copy failed — long-press to copy manually',
      pasteFirst: 'Paste a recipe code first',
      badCode: 'That recipe code doesn’t read — check it was copied in full',
      friendRecipe: 'A friend’s recipe',
      applied: 'Mixed “{name}”',
      appliedPlus: 'Mixed the free sounds — the Plus sounds in this recipe are kept',
      cardDone: 'Share card made — downloading now',
      shareTagline: 'Mix your own cup of sound',
      importBadCode: 'That recipe code doesn’t read — check it and paste the full code again.',
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
      premiumMsg: '“{name}” is Plus content. Plus is still being prepared.',
      immRemainingAria: 'Time left in this session',
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
      formMissing: 'The payment form came back wrong — no submittable form was found.',
      httpStatus: '(HTTP {status})',
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
  },
};

/** 按点路径取文案：t('en', 'nav.mixer')。缺失时回落中文，再缺失返回 key。
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
