/**
 * 界面语言测试（2026-11-12 混排修复）。
 *
 * 规则：
 * - 英文界面不出现任何中文（CJK）；中文界面不出现英文界面标签。
 *   例外只有品牌名（Sound Cocktail / Google / Apple Pay / Google Pay）、
 *   配方码前缀（SYL-）、协议名（HTTP）、路由与存储标识（/api、ORDERS_KV 等），
 *   以及只在英文界面渲染的装饰性英文副标题（mixer.en 等，中文界面不渲染）。
 * - 自动配方名、配比汇总、配方卡片日期都按当前语言生成；
 *   用户自己输入的配方名不在这里翻译——存下来的名字原样展示。
 * - 语言只改文案，不改价格：packDisplay 的金额只看币种（支付地区），
 *   与 locale 无关（2026-11-12 解耦规则的回归守卫）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { API_ERROR_MESSAGES, STRINGS, apiErrorMessage, t } from '../src/locale.mjs';
import {
  RECIPES,
  SOUNDS,
  autoRecipeName,
  formatRecipeDate,
  mixSummaryText,
  recipeDisplay,
  soundDisplayName,
} from '../src/catalog.mjs';
import { PACKS, packDisplay } from '../src/packs.mjs';

const CJK = /[\u4e00-\u9fff]/;
const LATIN = /[A-Za-z]/;

// 只在英文界面出现的装饰性英文副标题（中文界面不渲染，见 SoundLabView/CheckoutView 的条件渲染）。
const EN_ONLY_SUBTITLES = new Set([
  'mixer.en',
  'recipes.en',
  'plus.en',
  'mine.en',
  'sources.en',
  'checkout.en',
]);
// 中文文案里允许出现的非中文记号：品牌名、支付品牌、配方码前缀、协议名、
// 路由与存储标识（/api、ORDERS_KV、wrangler.jsonc、kv_namespaces）。
const ALLOWED_LATIN = [
  'Sound Cocktail',
  'Apple Pay',
  'Google Pay',
  'Google',
  'SYL-',
  'HTTP',
  '/api',
  'ORDERS_KV',
  'wrangler.jsonc',
  'kv_namespaces',
];

function stripAllowed(value) {
  let out = String(value).replace(/\{[^}]*\}/g, '');
  for (const token of ALLOWED_LATIN) out = out.split(token).join('');
  return out;
}

function walkStrings(node, path, visit) {
  if (typeof node === 'string') visit(node, path);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      walkStrings(value, path ? `${path}.${key}` : key, visit);
    }
  }
}

test('locale: every EN string has no CJK', () => {
  walkStrings(STRINGS.en, '', (value, path) => {
    assert.ok(!CJK.test(value), `EN ${path} contains CJK: ${value}`);
  });
  walkStrings(API_ERROR_MESSAGES.en, 'api', (value, path) => {
    assert.ok(!CJK.test(value), `EN ${path} contains CJK: ${value}`);
  });
});

test('locale: CN strings have no leftover English UI labels', () => {
  const check = (value, path) => {
    if (EN_ONLY_SUBTITLES.has(path)) return;
    assert.ok(!LATIN.test(stripAllowed(value)), `CN ${path} contains Latin: ${value}`);
  };
  walkStrings(STRINGS.zh, '', check);
  walkStrings(API_ERROR_MESSAGES.zh, 'api', check);
});

test('locale: t() replaces {placeholders} and falls back to the key', () => {
  assert.equal(t('en', 'mine.saved', { name: 'Rain' }), 'Saved “Rain”');
  assert.equal(t('zh', 'mine.saved', { name: '雨' }), '已保存「雨」');
  assert.equal(
    t('en', 'mixer.groupCount', { n: 8 }),
    '8 sounds · open “Tuning” to fine-tune each one',
  );
  assert.equal(t('en', 'does.not.exist'), 'does.not.exist');
});

test('locale: apiErrorMessage maps known server codes, null otherwise', () => {
  assert.equal(
    apiErrorMessage('INVALID_CREDENTIALS', 'en'),
    'Wrong email or password. Please try again.',
  );
  assert.equal(apiErrorMessage('INVALID_CREDENTIALS', 'zh'), '邮箱或密码不对，请再试一次。');
  assert.equal(
    apiErrorMessage('PAYMENT_NOT_CONFIGURED', 'en'),
    'Payment is not configured: the Alipay sandbox/production setup is missing.',
  );
  assert.equal(apiErrorMessage('UNKNOWN_CODE', 'en'), null);
  assert.equal(apiErrorMessage(null, 'en'), null);
});

function soundById(id) {
  return SOUNDS.find((sound) => sound.id === id);
}

test('catalog: channel display names are single-locale', () => {
  for (const sound of SOUNDS) {
    const en = soundDisplayName(sound, 'en');
    const zh = soundDisplayName(sound, 'zh');
    assert.ok(!CJK.test(en), `${sound.id} EN name contains CJK: ${en}`);
    assert.ok(!LATIN.test(zh), `${sound.id} CN name contains Latin: ${zh}`);
    assert.notEqual(en, zh, `${sound.id} EN/CN names should differ`);
  }
  assert.equal(soundDisplayName(soundById('cafe'), 'en'), 'Café Voices');
  assert.equal(soundDisplayName(soundById('cafe'), 'zh'), '咖啡馆人声');
});

test('catalog: recipe display follows locale', () => {
  for (const recipe of RECIPES) {
    const en = recipeDisplay(recipe, 'en');
    const zh = recipeDisplay(recipe, 'zh');
    for (const field of ['name', 'tag', 'intent', 'desc']) {
      assert.ok(!CJK.test(en[field]), `${recipe.name} EN ${field} contains CJK: ${en[field]}`);
      assert.ok(!LATIN.test(zh[field]), `${recipe.name} CN ${field} contains Latin: ${zh[field]}`);
    }
  }
});

test('catalog: auto recipe name is generated in the current locale', () => {
  const active = [
    { sound: soundById('rain'), level: 0.8 },
    { sound: soundById('fire'), level: 0.52 },
  ];
  assert.equal(autoRecipeName(active, 'en'), 'Rain + Fire Night');
  assert.equal(autoRecipeName(active, 'zh'), '雨 + 篝火 之夜');
  assert.equal(autoRecipeName([], 'en'), '');
});

test('catalog: mix summary follows locale', () => {
  const active = [
    { sound: soundById('rain'), level: 0.8 },
    { sound: soundById('fire'), level: 0.52 },
    { sound: soundById('piano'), level: 0.4 },
  ];
  assert.equal(mixSummaryText(active, 'en'), 'Current mix: Rain 80 · Fire 52 · Piano 40');
  assert.equal(mixSummaryText(active, 'zh'), '当前配比：雨 80 · 篝火 52 · 钢琴 40');
  assert.equal(mixSummaryText([], 'en'), 'Current mix: no fader moved yet.');
  assert.equal(mixSummaryText([], 'zh'), '当前配比：还没有拉动任何推子。');
});

test('catalog: saved-recipe dates follow locale', () => {
  const at = new Date(2026, 10, 12, 0, 55); // local time Nov 12 00:55
  assert.equal(formatRecipeDate(at, 'en'), 'Nov 12, 00:55');
  assert.equal(formatRecipeDate(at, 'zh'), '11月12日 00:55');
});

test('packs: pack display follows locale, price follows region (decoupling)', () => {
  for (const pack of PACKS) {
    const en = packDisplay(pack, 'en', 'USD');
    const zh = packDisplay(pack, 'zh', 'CNY');
    assert.ok(!CJK.test(en.name + en.desc), `${pack.id} EN pack copy contains CJK`);
    assert.ok(!LATIN.test(zh.name + zh.desc), `${pack.id} CN pack copy contains Latin`);
    // 语言只改文案，不改价格：英文界面 + 人民币地区仍显示 ¥，中文界面 + 美元地区仍显示 $。
    assert.equal(packDisplay(pack, 'en', 'CNY').priceLabel, pack.priceLabel);
    assert.equal(packDisplay(pack, 'zh', 'USD').priceLabel, pack.priceLabelUsd);
  }
});
