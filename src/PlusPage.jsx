/**
 * 进阶页（/en/plus、/zh/plus）：免费版 + 订阅（月付 / 年付）。
 *
 * 订阅模型（2026-11-16）：免费入口是清迈 + 巴厘岛两个目的地、
 * 10 分钟调音台窗口与基础调音；订阅解锁其余 4 个目的地、不限时
 * 收听、完整调音器（全部通道 + 调参 + 保存配方）与睡眠定时。
 * 三个一次性声音包已下架（无人购买），不再出售。
 *
 * 价格跟支付地区走，不跟语言走（2026-11-12 解耦规则）：
 * 文案按 locale，金额按 region——在国外的中文界面显示 $ 价，
 * 在中国的英文界面显示 ¥ 价。CNY 展示时年卡在前（国内用户更
 * 偏年付/一次性；不设终身档）。
 *
 * 免费试用（limer 2026-11-16 确认）：只给海外（Waffo/USD）订阅开，
 * 7 天，计划卡片上显示；国内支付宝月卡/年卡是一次性购买，不设试用，
 * 不显示试用字样。
 *
 * 订阅状态：当前计划卡片显示有效期与续费方式；Waffo 订阅在客户
 * 中心自助取消/换计划（POST /api/waffo/portal），支付宝月卡/
 * 年卡是一次性购买、到期不自动续费，买新卡即续费。
 */
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLab } from './lab-context.jsx';
import { SUBSCRIPTION_PLANS, planDisplay } from './subscription.mjs';
import { currencyForRegion, useRegion } from './region.mjs';
import { localizePath, t, useLocale } from './locale.mjs';

function formatExpiry(ms, locale) {
  try {
    return new Date(ms).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function PlusPage() {
  const { subscription, isSubscriber, pendingWaffoOrders } = useLab();
  const [locale] = useLocale();
  const { region } = useRegion();
  const currency = currencyForRegion(region);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState('');
  // 进行中的 Waffo 订单（按计划 ID）：有未付款订单的计划不展示购买按钮，
  // 改展示“继续付款”，打开原来的收银台（防重复付款）。进行中订单
  // 只有海外地区才有；中国地区 pending 列表为空，这里自然不展示。
  const pendingByPlan = {};
  (pendingWaffoOrders || []).forEach((order) => {
    if (order && order.productId && order.checkoutUrl && !pendingByPlan[order.productId]) {
      pendingByPlan[order.productId] = order;
    }
  });
  // CNY 展示时年卡在前；USD 展示时月付在前。
  const plans = currency === 'CNY' ? [...SUBSCRIPTION_PLANS].reverse() : SUBSCRIPTION_PLANS;
  const currentPlanId = isSubscriber ? subscription?.plan : null;
  const expiry = subscription?.currentPeriodEnd ? formatExpiry(subscription.currentPeriodEnd, locale) : '';

  async function openPortal() {
    setPortalError('');
    setPortalBusy(true);
    try {
      const res = await fetch('/api/waffo/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.portalUrl) throw new Error(data.message || 'portal failed');
      window.open(data.portalUrl, '_blank', 'noopener');
    } catch {
      setPortalError(t(locale, 'plus.portalError', { email: 'weiyezhu180@gmail.com' }));
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <section className="blk" id="plus">
      <div className="sec-head"><h2>{t(locale, 'plus.title')}</h2>{locale === 'en' ? <span className="en">{t(locale, 'plus.en')}</span> : null}</div>
      <p className="sec-sub">{t(locale, 'plus.sub')}</p>
      {isSubscriber && subscription ? (
        <p className="plus-status" role="status">
          {t(locale, 'plus.currentPlan', { plan: (planDisplay(SUBSCRIPTION_PLANS.find((p) => p.id === subscription.plan), locale, currency) || {}).name || subscription.plan })}
          {' · '}
          {subscription.provider === 'waffo'
            ? t(locale, 'plus.renewsAuto', { date: expiry })
            : t(locale, 'plus.endsOn', { date: expiry })}
        </p>
      ) : null}
      <div className="cards access-cards">
        <article className="card"><h3>{t(locale, 'plus.freeTitle')}</h3><p>{t(locale, 'plus.freeDesc')}</p></article>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const pending = pendingByPlan[plan.id];
          const display = planDisplay(plan, locale, currency);
          const isYearly = plan.id === 'subscription-yearly';
          return (
            <article className="card" key={plan.id}>
              <h3>{display.name} <span className="tag">{isCurrent ? t(locale, 'plus.current') : isYearly ? t(locale, 'plus.yearlyTag') : display.priceLabel}</span></h3>
              <p>{display.desc}</p>
              <p className="plus-unlocks">{t(locale, 'plus.unlocks')}</p>
              {display.trialDays ? <p className="plus-trial">{t(locale, 'plus.trialNote')}</p> : null}
              <div className="row">
                <span className="price">{display.priceLabel}<small> / {display.periodLabel}</small></span>
                <span style={{ flex: 1 }}></span>
                {isCurrent ? (
                  subscription.provider === 'waffo' ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={openPortal} disabled={portalBusy}>{t(locale, 'plus.managePortal')}</button>
                  ) : (
                    <Link to={localizePath('/', locale)} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.goMixer')}</Link>
                  )
                ) : pending ? (
                  <a href={pending.checkoutUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.continuePay')}</a>
                ) : isSubscriber && subscription?.provider === 'waffo' ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={openPortal} disabled={portalBusy}>{t(locale, 'plus.changePlanPortal')}</button>
                ) : (
                  <Link to={localizePath('/checkout', locale)} search={{ plan: plan.id }} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{t(locale, 'plus.buy')}</Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {portalError ? <p className="plus-error" role="alert">{portalError}</p> : null}
      <p className="plus-notes">{t(locale, 'plus.cancelNote')} {t(locale, 'plus.refundNote')}</p>
    </section>
  );
}
