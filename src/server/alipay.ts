/**
 * 支付宝 SDK 工厂（Workers 版）。
 *
 * 与 Express 版（sound-cocktail-pay-server/src/alipay.js）相同的调用方式：
 *   sdk.pageExec('alipay.trade.page.pay', 'POST', {...})  // 页面跳转类 API
 *   sdk.exec('alipay.trade.query', {...})                 // 服务端 API
 *   sdk.checkNotifySignV2(params)                         // 异步通知验签
 *
 * 区别：
 * - Express 版在模块内缓存单例并从文件读配置；Workers 版每次请求
 *   用本次请求解析出的配置新建 SDK（Worker 里没有进程级可信缓存，
 *   且环境变量必须在请求处理时读取，不能在模块顶层读取）。
 * - 私钥以字符串传入，不从文件路径读取（Workers 没有 fs）。
 */
import { AlipaySdk } from 'alipay-sdk'
import type { PayConfig } from './config'

export function createSdk(cfg: PayConfig): AlipaySdk {
  return new AlipaySdk({
    appId: cfg.appId,
    privateKey: cfg.privateKey,
    alipayPublicKey: cfg.alipayPublicKey,
    gateway: cfg.gateway,
    signType: 'RSA2',
  })
}
