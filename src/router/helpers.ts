import { type Validator, validators } from '@anjianshi/utils/validators/index.js'
import { HTTPError } from '@/index.js'
import { type BasicContext } from './index.js'

export { validators }

export function validatePathParameters<T>(this: BasicContext, struct: Record<string, Validator>) {
  const result = validators.struct(struct).validate('path', this.pathParameters)
  if (result.success) return result.data as T
  throw new HTTPError(400, result.message)
}

export function validateQuery<T>(this: BasicContext, struct: Record<string, Validator>) {
  const result = validators.struct(struct).validate('query', this.request.query)
  if (result.success) return result.data as T
  throw new HTTPError(400, result.message)
}

export async function validateBody<T>(this: BasicContext, struct: Record<string, Validator>) {
  const body = await this.request.body.json()
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new HTTPError(400, 'Invalid JSON body, should be an object.')

  const result = validators.struct(struct).validate('body', this.request.body)
  if (result.success) return result.data as T
  throw new HTTPError(400, result.message)
}
