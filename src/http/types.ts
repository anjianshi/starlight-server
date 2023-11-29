/**
 * 重新定义 HTTP 请求相关类型
 * Redefine HTTP request-related types.
 */
import type http from 'node:http'
import { HTTPStatusMap } from './http-status.js'

/**
 * Node.js 原生的请求对象
 * Node.js native request object
 */
export type NodeRequest = http.IncomingMessage

/**
 * Node.js 原生的响应对象
 * Node.js native response object
 */
export type NodeResponse = http.ServerResponse & { req: http.IncomingMessage }

/**
 * 带有 HTTP Status 的错误对象
 * Error object with HTTP Status
 */
export class HTTPError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message ?? HTTPStatusMap.get(status) ?? status.toString())
    this.status = status
  }
}
