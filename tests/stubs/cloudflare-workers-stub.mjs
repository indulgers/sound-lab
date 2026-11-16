/**
 * 测试替身：cloudflare:workers 的 env。
 *
 * 路由模块从 'cloudflare:workers' 读 env；Node 里没有这个模块，
 * 由 tests/waffo-hooks.mjs 把它解析到这里。env 是可变对象，
 * 测试在每次调用路由前填入本次的 ORDERS_KV 等值。
 */
export const env = {
  ORDERS_KV: undefined,
  WAFFO_MERCHANT_ID: 'MER_test_stub',
  WAFFO_PRIVATE_KEY: 'stub-key',
  WAFFO_SUBSCRIPTION_MONTHLY: 'PROD_monthly',
  WAFFO_SUBSCRIPTION_YEARLY: 'PROD_yearly',
  WAFFO_STORE_ID: 'STO_test_stub',
  WAFFO_ENV: 'test',
};
