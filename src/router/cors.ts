import { type Request, type ResponseUtils } from '@/http/index.js'

/**
 * CORS 配置
 *
 * - false: 不处理跨域
 * - true: 支持且不设限（等同于 { allowOrigin: '*', allowHeaders: '*', exposeHeaders: '*' }）
 * - { allowOrigin, allowHeaders, exposeHeaders }: 手动配置
 *
 * allowHeaders 仅对 Preflight 请求有效
 * exposeHeaders 仅对非 Preflight 请求有效
 */
export type CORSOptions =
  | boolean
  | { allowOrigin?: string; allowHeaders?: string; exposeHeaders?: string }

/**
 * 若当前请求是 CORS Preflight 请求，返回实际请求的 method；若不是 Preflight 请求，返回 null
 */
export function getMethodFromCORSPreflight(request: Request) {
  if (
    request.method === 'OPTIONS' &&
    request.headers['Access-Control-Request-Methods'] !== undefined
  ) {
    const rawMethod = request.headers['Access-Control-Request-Methods']
    return Array.isArray(rawMethod) ? rawMethod[0]! : rawMethod
  }
  return null
}

/**
 * 输出 CORS 相关 headers
 */
export function outputCORSHeaders(
  response: ResponseUtils,
  cors: CORSOptions,
  isPreflight: boolean,
) {
  if (cors === true) {
    response.headers(['Access-Control-Allow-Origin', '*'])
    if (isPreflight) response.headers(['Access-Control-Allow-Headers', '*'])
    else response.headers(['Access-Control-Expose-Headers', '*'])
  } else if (cors !== false) {
    if (cors.allowOrigin !== undefined)
      response.header('Access-Control-Allow-Origin', cors.allowOrigin)
    if (isPreflight && cors.allowHeaders !== undefined)
      response.header('Access-Control-Allow-Headers', cors.allowHeaders)
    if (!isPreflight && cors.exposeHeaders !== undefined)
      response.header('Access-Control-Expose-Headers', cors.exposeHeaders)
  } else {
    // 若指定为“不处理跨域”，则不输出 headers，浏览器会默认服务端不允许跨域请求
    // （后续 route handler 仍有机会自行设置 CORS headers）
  }
}
