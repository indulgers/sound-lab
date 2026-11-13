/**
 * 外壳 → 各页面的共享数据（拆页后路由组件不再经 SoundLabView 的 props
 * 拿数据，改从这里读；外壳在根路由提供，Outlet 子树都能读到）。
 *
 * 包含：配方/音色常量（catalog.mjs）、选场景/看进阶回调（音频引擎
 * 控制器的方法）、登录用户、已拥有包、进行中 Waffo 订单、刷新登录态。
 * 语言与支付地区不走这里（locale.mjs / region.mjs 各自负责）。
 */
import { createContext, useContext } from 'react';

/** @type {import('react').Context<any>} */
export const LabContext = createContext(null);

export function useLab() {
  const value = useContext(LabContext);
  if (!value) throw new Error('useLab must be used inside LabContext.Provider (root shell)');
  return value;
}
