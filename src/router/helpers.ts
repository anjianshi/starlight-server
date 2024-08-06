import { type MaySuccess, success, failed } from '@anjianshi/utils'
import {
  getValidator,
  type Definition as ValidatorDefinition,
} from '@anjianshi/utils/validators/index.js'
import { HTTPError } from '@/index.js'
import { type Request } from '@/http/request.js'
import { type ResponseUtils } from '@/http/response.js'
import { type PathParameters } from './match-path.js'

class RequestHelpers {
  constructor(
    readonly request: Request,
    readonly pathParameters: PathParameters,
  ) {}

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

  validateQuery<const Definition extends Record<string, ValidatorDefinition>>(struct: Definition) {
    const result = getValidator({ type: 'struct', struct })('query', this.request.query)
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

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

  // 输出成功结果
  success(data?: unknown) {
    if (data instanceof Promise) throw new Error('不能用 promise 作为响应内容')
    this.maySuccess(success(data))
  }

  // 输出失败结果
  failed(message: string, code?: string | number): void
  failed<T>(message: string, code: string | number | undefined, data: T): void
  failed<T>(message: string, code?: string | number, data?: T) {
    if (data instanceof Promise) throw new Error('不能用 promise 作为响应内容')
    this.maySuccess(failed(message, code, data))
  }

  // 输出 MaySuccess 对象
  maySuccess(result: MaySuccess<unknown, unknown>): void {
    this.response.json(result)
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
