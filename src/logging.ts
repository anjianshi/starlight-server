/**
 * 实现日志记录
 */
import { truthy, Logger, LogLevel, adaptDebugLib } from '@anjianshi/utils'
import {
  ConsoleHandler,
  FileHandler,
  type FileHandlerOptions,
} from '@anjianshi/utils/env-node/logging.js'
import debug from 'debug'

export type { FileHandlerOptions }
export { Logger, LogLevel }

export interface LoggingOptions {
  /**
   * 指定日志等级（debug info warn err）
   * Specify log level.
   */
  level?: string | LogLevel

  /**
   * 文件日志参数
   * File log options
   */
  file?: Partial<FileHandlerOptions>

  /**
   * 是否把 debug 库的日志引入进来；可通过字符串指定匹配规则
   * Whether to import logs from 'debug' library; can specify matching rules through strings
   */
  debugLib?: boolean | string
}

export function getLogger(options: LoggingOptions = {}) {
  const logger = new Logger()
  logger.addHandler(new ConsoleHandler())
  if (options.level !== undefined) logger.setLevel(options.level)
  if (options.file) logger.addHandler(new FileHandler(options.file))
  if (truthy(options.debugLib))
    adaptDebugLib(debug, options.debugLib === true ? '*' : options.debugLib, logger)
  return logger
}
