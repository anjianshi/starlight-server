import { type Logger } from '@/logging.js'
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
    /** 处理 JSON 输出中的自定义类型 */
    public jsonReplacer?: (key: string, value: unknown) => unknown,
  ) {}

  header(name: string, value: string) {
    this.nodeResponse.setHeader(name, value)
  }

  headers(...items: [string, string][]): void
  headers(items: Record<string, string>): void
  headers(...items: [string, string][] | [Record<string, string>]) {
    if (items.length === 1 && typeof items[0] === 'object') {
      items = Object.entries(items[0] as Record<string, string>)
    }
    void (items as [string, string][]).forEach(([name, value]) => this.header(name, value))
  }

  text(content: string | Buffer) {
    this.nodeResponse.end(content)
  }

  /**
   * Output JSON
   */
  json(data: unknown) {
    try {
      const json = JSON.stringify(data, this.jsonReplacer)
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
   *
   * response.error(new HTTPError(xxx)) // 传入 HTTP Error
   * response.error(404) // 传入 HTTP Status
   * response.error(xxx) // 传入其他内容，会记录下日志并以 500 状态结束请求
   */
  error(error: unknown) {
    if (error instanceof HTTPError) {
      this.nodeResponse.statusCode = error.status // eslint-disable-line require-atomic-updates
      this.nodeResponse.end(error.message)
    } else if (typeof error === 'number') {
      this.error(new HTTPError(error))
    } else {
      this.logger.error(error)
      this.error(new HTTPError(500))
    }
  }

  /**
   * 执行重定向
   */
  redirect(url: string, permanent = false) {
    this.nodeResponse.statusCode = permanent ? 301 : 302
    this.header('Location', url)
    this.nodeResponse.end()
  }
}
