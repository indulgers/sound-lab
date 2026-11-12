/**
 * node:test 用的模块解析钩子：把路由模块依赖的两个运行环境模块
 * 换成 tests/stubs 下的替身。
 *
 * - 'cloudflare:workers' → 可变的 env 对象（测试填入 FakeKV 与配置）。
 * - '@waffo/pancake-ts' → 替身 SDK（checkout 返回预设收银台地址，
 *   GraphQL 返回预设 payments，不发真实网络请求）。
 *
 * 用法：在测试文件顶部（任何静态 import 之前）调用
 *   import { register } from 'node:module';
 *   register('./waffo-hooks.mjs', import.meta.url);
 * 然后动态 import 路由模块。静态 import 会在 register() 之前
 * 就解析加载，所以路由模块必须动态 import。
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const stubsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'stubs');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') {
    return {
      url: pathToFileURL(path.join(stubsDir, 'cloudflare-workers-stub.mjs')).href,
      shortCircuit: true,
    };
  }
  if (specifier === '@waffo/pancake-ts') {
    return {
      url: pathToFileURL(path.join(stubsDir, 'waffo-sdk-stub.mjs')).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
