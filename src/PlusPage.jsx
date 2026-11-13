/**
 * 进阶页（/en/plus、/zh/plus）：免费版 + 三个一次性声音包。
 *
 * 价格跟支付地区走，不跟语言走（2026-11-12 解耦规则）：
 * 文案按 locale，金额按 region——在国外的中文界面显示 $ 价，
 * 在中国的英文界面显示 ¥ 价。
 */
import { Link } from '@tanstack/react-router';
import { useLab } from './lab-context.jsx';
import { PACKS, packDisplay } from './packs.mjs';
import { currencyForRegion, useRegion } from './region.mjs';
import { localizePath, t, useLocale } from './locale.mjs';

export default function PlusPage() {
  const { ownedPacks, pendingWaffoOrders } = useLab();
  const [locale] = useLocale();
  const { region } = useRegion();
  const currency = currencyForRegion(region);
  const owned = new Set(ownedPacks || []);
  // 进行中的 Waffo 订单（按包 ID）：有未付款订单的包不展示购买按钮，
  // 改展示“继续付款”，打开原来的收银台（防重复付款）。进行中订单
  // 只有海外地区才有；中国地区 pending 列表为空，这里自然不展示。
  const pendingByPack = {};
  (pendingWaffoOrders || []).forEach((order) => {
    if (order && order.productId && order.checkoutUrl && !pendingByPack[order.productId]) {
      pendingByPack[order.productId] = order;
    }
  });
  return (
    <section className="blk" id="plus">
      <div className="sec-head"><h2>{t(locale, 'plus.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'plus.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'plus.sub')}</p>
      <div className="cards access-cards">
        <article className="card"><h3>{t(locale, 'plus.freeTitle')}</h3><p>{t(locale, 'plus.freeDesc')}</p></article>
        {PACKS.map((pack) => {
          const isOwned = owned.has(pack.id);
          const pending = pendingByPack[pack.id];
          const display = packDisplay(pack, locale, currency);
          return (
            <article className="card" key={pack.id}>
              <h3>{display.name} <span className="tag">{isOwned ? t(locale, 'plus.owned') : pending ? t(locale, 'plus.inProgress') : display.priceLabel}</span></h3>
              <p>{display.desc}</p>
              <div className="row">
                <span className="price">{display.priceLabel}<small>{t(locale, 'plus.once')}</small></span>
                <span style={{ flex: 1 }}></span>
                {isOwned ? (
                  <Link to={localizePath('/', locale)} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.goMixer')}</Link>
                ) : pending ? (
                  <a href={pending.checkoutUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.continuePay')}</a>
                ) : (
                  <Link to={localizePath('/checkout', locale)} search={{ pack: pack.id }} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.buy')}</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
