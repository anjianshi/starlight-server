/**
 * CORS 处理逻辑
 */
import { type Request } from './request.js'
import { ResponseUtils } from './response.js'
import { type NodeRequest, type NodeResponse } from './types.js'

/**
 * 判断是否是 CORS Preflight 请求
 */
export function isPreflight(request: Request | NodeRequest) {
  return (
    request.method === 'OPTIONS' &&
    typeof request.headers['access-control-request-method'] === 'string'
  )
}

/**
 * 若请求是 CORS Preflight 请求，返回客户端原本想请求的 Method
 * 否则返回 null
 */
export function getPreflightRequestMethod(request: Request | NodeRequest) {
  return isPreflight(request) ? request.headers['access-control-request-method'] ?? '' : null
}

/**
 * CORS 放行规则
 * - false：不放行
 * - true：无条件放行（等同于 { allowOrigin: '*', allowHeaders: '*', exposeHeaders: '*' }）
 * - object：手动指定规则
 *   - 未指定的 key 不会输出对应 header
 *   - allowHeaders 仅对 Preflight 请求有效
 *   - exposeHeaders 仅对非 Preflight 请求有效
 */
export type CORSRule =
  | boolean
  | { allowOrigin?: string; allowHeaders?: string; exposeHeaders?: string }

/**
 * 输出 CORS 相关 headers
 */
export function handleCORS(
  request: Request | NodeRequest,
  response: ResponseUtils | NodeResponse,
  rule: CORSRule,
) {
  // 不输出 CORS 相关 headers，浏览器会默认服务端不允许跨域请求
  if (rule === false) return
  if (rule === true) rule = { allowOrigin: '*', allowHeaders: '*', exposeHeaders: '*' }

  const nodeResponse = response instanceof ResponseUtils ? response.nodeResponse : response
  const requestIsPreflight = isPreflight(request)
  if (rule.allowOrigin !== undefined)
    nodeResponse.setHeader('Access-Control-Allow-Origin', rule.allowOrigin)
  if (requestIsPreflight && rule.allowHeaders !== undefined)
    nodeResponse.setHeader('Access-Control-Allow-Headers', rule.allowHeaders)
  if (!requestIsPreflight && rule.exposeHeaders !== undefined)
    nodeResponse.setHeader('Access-Control-Expose-Headers', rule.exposeHeaders)
  if (requestIsPreflight)
    nodeResponse.setHeader(
      'Access-Control-Allow-Methods',
      getPreflightRequestMethod(request) ?? request.method ?? '',
    )
}
