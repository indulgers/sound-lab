/**
 * 测试替身：@waffo/pancake-ts。
 *
 * 路由模块在 Node 测试里无法调真实 Waffo API（本机 workerd 的 TLS
 * 也调不通），所以用这个替身上 SDK：checkout 会话创建返回
 * 预设的收银台地址，GraphQL 返回测试预设的 payments。
 * 每次调用 checkout 都返回不同的 sessionId，便于区分新旧订单。
 */
export class WaffoPancakeError extends Error {
  constructor(message, opts = {}) {
    super(message);
    this.name = 'WaffoPancakeError';
    this.status = opts.status;
    this.errors = opts.errors;
  }
}

let checkoutCalls = 0;

/** 测试预设的 GraphQL payments 返回值（order-status 快查用）。 */
export let stubGraphqlPayments = [];

export function setStubGraphqlPayments(payments) {
  stubGraphqlPayments = payments;
}

export function resetStubCheckoutCalls() {
  checkoutCalls = 0;
}

export class WaffoPancake {
  constructor(config) {
    this.config = config;
  }

  checkout = {
    authenticated: {
      create: async () => {
        checkoutCalls += 1;
        return {
          checkoutUrl: `https://checkout.example/cs_stub_${checkoutCalls}`,
          sessionId: `cs_stub_${checkoutCalls}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      },
    },
  };

  graphql = {
    query: async () => ({ data: { payments: stubGraphqlPayments } }),
  };
}

export function verifyWebhook() {
  throw new Error('stub: verifyWebhook is not implemented');
}
