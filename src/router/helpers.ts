import { success, failed } from '@anjianshi/utils'
import { type Validator, validators } from '@anjianshi/utils/validators/index.js'
import { HTTPError } from '@/index.js'
import { type BasicContext } from './index.js'

export class Helpers {
  constructor(readonly context: BasicContext) {}

  validatePathParameters<T>(struct: Record<string, Validator>) {
    const result = validators.struct(struct).validate('path', this.context.pathParameters)
    if (result.success) return result.data as T
    throw new HTTPError(400, result.message)
  }

  validateQuery<T>(struct: Record<string, Validator>) {
    const result = validators.struct(struct).validate('query', this.context.request.query)
    if (result.success) return result.data as T
    throw new HTTPError(400, result.message)
  }

  async validateBody<T>(struct: Record<string, Validator>) {
    const body = await this.context.request.body.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body))
      throw new HTTPError(400, 'Invalid JSON body, should be an object.')

    const result = validators.struct(struct).validate('body', body)
    if (result.success) return result.data as T
    throw new HTTPError(400, result.message)
  }

  success(data?: unknown) {
    this.context.response.json(success(data))
  }

  failed(message: string, code?: string | number): void
  failed<T>(message: string, code: string | number | undefined, data: T): void
  failed<T>(message: string, code?: string | number, data?: T) {
    this.context.response.json(failed(message, code, data))
  }
}
