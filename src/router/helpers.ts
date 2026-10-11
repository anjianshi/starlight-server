import { type Result, success, failure, formatSuccess } from '@anjianshi/utils'
import {
  getValidator,
  type Definition as ValidatorDefinition,
  type AllowedInputValue,
} from '@anjianshi/utils/validators/index.js'
import { type Request } from '@/http/request.js'
import { type ResponseUtils } from '@/http/response.js'
import { HTTPError } from '@/index.js'
import { type PathParameters } from './match-path.js'

class RequestHelpers {
  constructor(
    readonly request: Request,
    readonly pathParameters: PathParameters,
  ) {}

  /**
   * 验证路径参数并返回经过格式化的数据
   */
  validatePathParameters<const Definition extends Record<string, ValidatorDefinition>>(
    struct: Definition,
  ) {
    const result = getValidator({ type: 'struct', struct })(
      'path',
      this.pathParameters as Record<string, string>,
    )
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

  /**
   * 验证 query string 并返回经过格式化的数据
   */
  validateQuery<const Definition extends Record<string, ValidatorDefinition>>(struct: Definition) {
    const result = getValidator({ type: 'struct', struct })('query', this.request.query)
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

  /**
   * 验证 Request Body 并返回经过格式化的数据。
   * 要求 Request Body 内容是对象（键值对），使用时分别指定每个字段的验证规则。
   */
  async validateBody<const Definition extends Record<string, ValidatorDefinition>>(
    struct: Definition,
  ) {
    const body = await this.request.body.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body))
      throw new HTTPError(400, 'Invalid JSON body, should be an object.')

    const result = getValidator({ type: 'struct', struct })('body', body as Record<string, string>)
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

  /**
   * 验证 Request Body 并返回经过格式化的数据。
   * 与 validateBody() 不同，此方法直接指定整个 Body 的验证规则，因此支持非键值对的 Body，
   * 或是对整个 Body 指定 one-of 等规则。
   */
  async validateBareBody<const Definition extends ValidatorDefinition>(definition: Definition) {
    const body = await this.request.body.json()
    const result = getValidator(definition)('body', body as AllowedInputValue)
    // 因 validator 类型推断过于复杂，会报 “Type instantiation is excessively deep and possibly infinite” 问题，这里将其屏蔽
    // @ts-expect-error 屏蔽类型推断问题
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }
}

export type RequestWithHelpers = Request & RequestHelpers

export function getRequestWithHelpers(request: Request, pathParameters: PathParameters) {
  const helpers = new RequestHelpers(request, pathParameters)
  return new Proxy(request, {
    get(target, prop): unknown {
      if (prop in helpers) return helpers[prop as keyof RequestHelpers]
      return request[prop as keyof Request]
    },
  }) as RequestWithHelpers
}

// -----------------------------

class ResponseUtilsHelpers {
  constructor(readonly response: ResponseUtils) {}

  // 原本这里想做成调用方法后直接结束 handler
  // 但因为 TypeScript 的限制，无法正确处理类方法的 never 返回值，所以作罢
  // https://github.com/microsoft/TypeScript/issues/36753

  /**
   * 输出成功结果
   * 支持传入第二个方法来对数据内容进行格式化：
   * response.success(formatSuccess(result, formatter)) => response.success(result, formatter)
   */
  success(): void
  success<T>(data: T, formatter?: (data: T) => unknown): void
  success<T>(data?: T, formatter?: (data: T) => unknown): void {
    if (data === undefined) {
      this.result(success())
    } else {
      if (data instanceof Promise) throw new Error('不能用 promise 作为响应内容')
      this.result(success(data), formatter)
    }
  }

  /**
   * 输出失败结果
   */
  failure(message: string, code?: unknown, data?: unknown) {
    if (data instanceof Promise) throw new Error('不能用 promise 作为响应内容')
    this.result(failure(message, code, data))
  }

  /**
   * 输出 Result 对象
   * 支持传入第二个方法来对成功结果的数据内容进行格式化：
   * response.result(formatSuccess(result, formatter)) => response.result(result, formatter)
   */
  result<T>(result: Result<T>, formatterForSuccess?: (data: T) => unknown) {
    if (formatterForSuccess) {
      this.response.json(formatSuccess(result, formatterForSuccess))
    } else {
      this.response.json(result)
    }
  }
}

export type ResponseUtilsWithHelpers = ResponseUtils & ResponseUtilsHelpers

export function getResponseUtilsWithHelpers(response: ResponseUtils) {
  const helpers = new ResponseUtilsHelpers(response)
  return new Proxy(response, {
    get(target, prop) {
      if (prop in helpers) return helpers[prop as keyof ResponseUtilsHelpers]
      return response[prop as keyof ResponseUtils]
    },
  }) as ResponseUtilsWithHelpers
}
