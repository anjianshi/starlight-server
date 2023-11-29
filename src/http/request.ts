import type http from 'node:http'
import { type Logger } from '@anjianshi/utils'
import { RequestBody, type BodyOptions } from './body/index.js'
import { HTTPError, type NodeRequest } from './types.js'

/**
 * 对 Node.js 请求内容的二次封装
 * - 提供经过整理的请求信息
 * - 自带 body 解析（实现了 “body 大小限制” 和 “JSON、form-data 等格式的内容解析”）
 *
 * Secondary encapsulation of the Node.js Request object
 * - Organized request information
 * - Comes with body parsing (implements 'body size limit' and 'content parsing for formats such as JSON and form-data').
 */
export class Request {
  readonly method: string
  readonly host: string
  readonly path: string
  readonly query: URLSearchParams
  readonly headers: http.IncomingHttpHeaders
  readonly body: RequestBody

  constructor(
    readonly nodeRequest: NodeRequest,
    protected readonly logger: Logger,
    bodyOptions: BodyOptions,
  ) {
    if (nodeRequest.method === undefined) throw new HTTPError(405)
    this.method = nodeRequest.method

    try {
      const url = new URL(nodeRequest.url ?? '', `http://${nodeRequest.headers.host ?? ''}`)
      this.host = url.host
      this.path = url.pathname
      this.query = url.searchParams
    } catch (e) {
      this.logger.warn('parse url failed', e)
      throw new HTTPError(400, 'url invalid')
    }

    this.headers = nodeRequest.headers
    this.body = new RequestBody(nodeRequest, bodyOptions)
  }
}
