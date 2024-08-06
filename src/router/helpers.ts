import { success, failed } from '@anjianshi/utils'
import {
  getValidator,
  type Definition as ValidatorDefinition,
} from '@anjianshi/utils/validators/index.js'
import { HTTPError } from '@/index.js'
import { type BasicContext } from './index.js'

export class Helpers {
  constructor(readonly context: BasicContext) {}

  validatePathParameters<Definition extends Record<string, ValidatorDefinition>>(
    struct: Definition,
  ) {
    const result = getValidator({ type: 'struct', struct })(
      'path',
      this.context.pathParameters as Record<string, string>,
    )
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

  validateQuery<Definition extends Record<string, ValidatorDefinition>>(struct: Definition) {
    const result = getValidator({ type: 'struct', struct })('query', this.context.request.query)
    if (result.success) return result.data
    throw new HTTPError(400, result.message)
  }

  async validateBody<Definition extends Record<string, ValidatorDefinition>>(struct: Definition) {
    const body = await this.context.request.body.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body))
      throw new HTTPError(400, 'Invalid JSON body, should be an object.')

    const result = getValidator({ type: 'struct', struct })('body', body as Record<string, string>)
    if (result.success) return result.data
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
