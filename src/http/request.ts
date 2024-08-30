import type http from 'node:http'
import { parseQuery } from '@anjianshi/utils'
import { type Logger } from '@/logging.js'
import { RequestBody, type BodyOptions } from './body/index.js'
import { HTTPError, type NodeRequest } from './types.js'

/**
 * 对 Node.js 请求内容的二次封装
 *
 * - 提供经过整理的请求信息
 * - 自带 body 解析（实现了 “body 大小限制” 和 “JSON、form-data 等格式的内容解析”）
 *
 * Secondary encapsulation of the Node.js Request object
 * - Organized request information
 * - Comes with body parsing (implements 'body size limit' and 'content parsing for formats such as JSON and form-data').
 */
export class Request {
  /** HTTP Method，始终为大写 */
  readonly method: string

  /** 完整的请求 URL */
  readonly url: string

  /** 域名及端口 */
  readonly host: string

  /** 请求路径 */
  readonly path: string

  /** 解析后的 query 对象 */
  readonly query: Record<string, string | string[]>

  /**
   * headers 对象，以 Record<string, xxx> 形式访问，仅支持小写 key。
   * （可使用 request.getHeader() 方法不区分大小写获取 header）
   */
  readonly headers: http.IncomingHttpHeaders

  /** 请求体。出于性能考虑，调用具体解析方法时才执行解析。 */
  readonly body: RequestBody

  constructor(
    readonly nodeRequest: NodeRequest,
    protected readonly logger: Logger,
    bodyOptions: BodyOptions,
  ) {
    if (nodeRequest.method === undefined) throw new HTTPError(405)
    this.method = nodeRequest.method.toUpperCase()

    try {
      // 参考：<https://nodejs.org/api/http.html#messageurl>
      const urlObject = new URL(nodeRequest.url ?? '', `http://${nodeRequest.headers.host ?? ''}`)
      this.url = urlObject.href
      this.host = urlObject.host
      this.path = urlObject.pathname
    } catch (e) {
      this.logger.warn(`parse URL failed：${nodeRequest.url}`, e)
      throw new HTTPError(400, 'URL invalid')
    }

    this.query = parseQuery(this.url, { array: true })
    this.headers = nodeRequest.headers
    this.body = new RequestBody(nodeRequest, bodyOptions)
  }

  /**
   * 获取 HTTP Header，支持任意大小写形式：content-type / Content-Type
   * 若 loose 为 true，固定返回一个字符串。有多个值时返回第一个，header 不存在时返回空字符串。
   */
  getHeader<const K extends string>(key: K, loose?: false): http.IncomingHttpHeaders[Lowercase<K>]
  getHeader<const K extends string>(key: K, loose: true): string
  getHeader<const K extends string>(
    key: K,
    loose?: boolean,
  ): http.IncomingHttpHeaders[Lowercase<K>] | string {
    const value = this.headers[key.toLowerCase()]
    if (loose === true) {
      if (typeof value === 'string') return value
      if (Array.isArray(value) && value.length > 0) return value[1]!
      return ''
    } else {
      return value
    }
  }
}
