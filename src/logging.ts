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

export interface LoggingOptions {
  /**
   * 指定日志等级（debug info warn err）
   * Specify log level.
   */
  level?: string

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

const levelMap: Record<string, LogLevel> = {
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warning,
  warning: LogLevel.Warning,
  err: LogLevel.Error,
  error: LogLevel.Error,
}

export function getLogger(options: LoggingOptions = {}) {
  const logger = new Logger()
  logger.addHandler(new ConsoleHandler())
  if (options.level !== undefined) {
    const level = levelMap[options.level.toLowerCase()]
    if (level !== undefined) logger.setLevel(level)
  }
  if (options.file) {
    logger.addHandler(new FileHandler(options.file))
  }
  if (truthy(options.debugLib)) {
    void adaptDebugLib(debug, options.debugLib === true ? '*' : options.debugLib, logger)
  }
  return logger
}
