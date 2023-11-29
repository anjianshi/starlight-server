import { type Logger } from '@anjianshi/utils'
import { path2MIMEType } from './mime-types.js'
import { HTTPError, type NodeResponse } from './types.js'

/**
 * 封装响应内容输出函数
 * Encapsulate functions for outputting response content.
 */
export class ResponseUtils {
  constructor(
    readonly nodeResponse: NodeResponse,
    readonly logger: Logger,
  ) {}

  header(name: string, value: string) {
    this.nodeResponse.setHeader(name, value)
  }

  headers(...items: [string, string][]) {
    items.forEach(([name, value]) => this.header(name, value))
  }

  /**
   * Output CORS Headers
   */
  cors(allowOrigin = '*', allowHeaders = '*') {
    this.headers(
      ['Access-Control-Allow-Origin', allowOrigin],
      ['Access-Control-Allow-Headers', allowHeaders],
    )
  }

  text(content: string | Buffer) {
    this.nodeResponse.end(content)
  }

  /**
   * Output JSON
   */
  json(data: unknown) {
    try {
      const json = JSON.stringify(data)
      this.header('Content-Type', 'application/json; charset=UTF-8')
      this.nodeResponse.end(json)
    } catch (e) {
      throw new HTTPError(500, 'Invalid JSON Response')
    }
  }

  /**
   * 原样输出文件内容，并带上文件类型对应的 MIME Type
   * Output the file content and include the MIME Type corresponding to the file type.
   */
  file(content: Buffer | string, path: string) {
    const mimeType = path2MIMEType(path)
    if (mimeType !== null) this.header('Content-Type', mimeType)
    this.nodeResponse.end(content)
  }

  /**
   * Output HTTP Error
   */
  error(error: unknown) {
    if (error instanceof HTTPError) {
      this.nodeResponse.statusCode = error.status // eslint-disable-line require-atomic-updates
      this.nodeResponse.end(error.message)
    } else {
      this.logger.error(error)
      this.nodeResponse.statusCode = 500 // eslint-disable-line require-atomic-updates
      this.nodeResponse.end(new HTTPError(500).message)
    }
  }
}
