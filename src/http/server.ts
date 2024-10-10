import http from 'node:http'
import { type Logger, LogLevel } from '@anjianshi/utils'
import { type BodyOptions } from './body/index.js'
import { Request } from './request.js'
import { ResponseUtils } from './response.js'
import { type NodeRequest, type NodeResponse } from './types.js'

export type RequestHandler = (request: Request, response: ResponseUtils) => unknown

/**
 * 二次封装 Node.js HTTP Server，实现了更完善的 request 和 response 处理
 * Secondary encapsulation of the Node.js HTTP Server, with more complete request and response handling.
 *
 * 功能点：
 * - 经过整理的 request 信息，且自带 body 解析
 * - 快速输出指定格式的响应内容
 * - 自带异常处理
 *   - 任意处抛出 HTTPError，可以指定 HTTP Status 结束请求
 *   - 抛出其他 Error，则以 Status 500 结束请求
 *
 * Features:
 * - Organized request information, and built-in body parsing
 * - Quickly output response content in a specified format
 * - Built-in exception handling
 *   - Throw HTTPError anywhere, and end the request with the specified HTTP Status
 *   - If another Error is thrown, end the request with Status 500
 *
 * Usage：
 * startHTTPServer(handler, options)
 */
export function startHTTPServer(
  options: BodyOptions & {
    handler?: RequestHandler
    logger: Logger
    port: number
    /** 处理 JSON 输出中的自定义类型，详见 JSON.stringify() 的 replacer 参数 */
    jsonReplacer?: (key: string, value: unknown) => unknown
  },
) {
  const { handler = placeholderHandler, logger, port, ...bodyOptions } = options

  async function handleRequest(nodeRequest: NodeRequest, nodeResponse: NodeResponse) {
    const logStart = Date.now()
    const logMethod = nodeRequest.method ?? 'UNKNOWN'
    const logUrl = nodeRequest.url ?? ''
    logger.info('<--', logMethod, logUrl)

    const response = new ResponseUtils(nodeResponse, logger, options.jsonReplacer)
    try {
      const request = new Request(nodeRequest, logger, bodyOptions)
      await handler(request, response)
    } catch (error) {
      response.error(error)
    }

    const logUsage = Date.now() - logStart
    const logStatus = nodeResponse.statusCode
    const logLevel = logStatus >= 400 ? LogLevel.Warning : LogLevel.Info
    logger.log(logLevel, ['-->', logMethod, logUrl, logStatus, `${logUsage}ms`])
  }

  const server = http.createServer(handleRequest)
  logger.info('Listening', port)
  server.listen(port)
}

function placeholderHandler(request: Request, response: ResponseUtils) {
  response.json({ message: 'Hello World, from starlight.' })
}
