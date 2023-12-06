/**
 * 实现通过 query / body parameters 的解析和验证
 */
import { success } from '@anjianshi/utils'
import { type Request, HTTPError } from '@/http/index.js'
import { type Validator, type CommonOptions } from '@/validators/common.js'
import * as validators from '@/validators/index.js'
import { type Route } from './router.js'

/**
 * ----------------------------------------
 * 类型定义
 * ----------------------------------------
 */

/**
 * 请求参数定义
 */
export interface Parameter {
  /** 字段名 */
  name: string

  /** 文字描述  */
  description?: string

  type: ParameterDataType

  /** 默认值，应与 type 匹配。若指定，则不再需要 required 规则。 */
  defaults?: unknown

  /** 是否允许为 undefined  */
  required?: boolean

  /** 是否允许为 null */
  nullable?: boolean

  /** 验证规则，会传给 type 对应的 validator */
  validate?: Record<string, unknown>
}

export type BasicDataType = 'string' | 'number' | 'boolean'

export type BasicParameter = Pick<
  Parameter,
  'type' | 'validate' | 'required' | 'nullable' | 'defaults' | 'description'
>

/**
 * 请求参数的数据类型定义
 */
export type ParameterDataType =
  | BasicDataType
  | { array: BasicParameter }
  | { record: BasicParameter } // 对应 object validator 的 value 类型
  | { object: Record<string, BasicParameter> } // 对应 object validator 的 struct 类型

/**
 * ----------------------------------------
 * 基础功能实现
 * ----------------------------------------
 */

/**
 * 基于 parameter 定义验证、格式化数据
 */
function validateParameters<T>(parameters: Parameter[], rawData: Record<string, unknown>) {
  const result = {} as Record<string, unknown>
  for (const parameter of parameters) {
    const validator = getValidatorOfParameter(parameter)
    const validateRes = validator.validate(parameter.name, rawData[parameter.name])
    if (validateRes.success) result[parameter.name] = validateRes.data
    else return validateRes
  }
  return success(result as T)
}

/**
 * 获取指定 parameter 的 validator
 */
function getValidatorOfParameter(parameter: BasicParameter) {
  if (!validatorCache.has(parameter)) {
    const validatorConstructor = getValidatorConstructor(parameter.type) as typeof validators.any
    const options = {
      null: parameter.nullable,
      void: typeof parameter.required === 'boolean' ? parameter.required : undefined,
      defaults: parameter.defaults,
      ...(parameter.validate ?? {}),
    }
    const validator = validatorConstructor(options)
    validatorCache.set(parameter, validator)
  }
  return validatorCache.get(parameter)!
}
const validatorCache = new WeakMap<BasicParameter, ReturnType<typeof validators.any>>()

/**
 * 取得与参数类型对应的 validator constructor
 */
function getValidatorConstructor(type: ParameterDataType): (options: CommonOptions) => Validator {
  if (typeof type === 'string') return validators[type]

  if ('array' in type) {
    const itemValidator = getValidatorOfParameter(type.array)
    return validators.array.bind(null, itemValidator)
  }

  if ('record' in type) {
    const itemValidator = getValidatorOfParameter(type.record)
    return validators.object.bind(null, itemValidator)
  }

  const struct: Record<string, Validator> = {}
  for (const [key, innerParameter] of Object.entries(type.object)) {
    struct[key] = getValidatorOfParameter(innerParameter)
  }
  return validators.object.bind(null, struct)
}

/**
 * ----------------------------------------
 * 与请求内容对接
 * ----------------------------------------
 */

/**
 * 验证 query 内容
 */
export function parseQuery<T>(route: Route, request: Request) {
  if (!route.query) throw new HTTPError(500, 'Call parseQuery() need query parameter definition.')

  const values: Record<string, unknown> = {}
  for (const parameter of route.query) {
    values[parameter.name] = getQueryParameterValue(request, parameter)
  }

  const res = validateParameters<T>(route.query, values)
  if (res.success) return res.data
  throw new HTTPError(400, res.error)
}

function getQueryParameterValue(request: Request, parameter: Parameter) {
  // array
  if (typeof parameter.type === 'object' && 'array' in parameter.type) {
    return request.query.getAll(parameter.name + '[]')
  }

  // undefined
  const raw = request.query.get(parameter.name)
  if (raw === null || raw === '') return undefined

  // basic type
  if (typeof parameter.type === 'string') return raw

  // object
  try {
    return JSON.parse(raw) as unknown
  } catch (error) {
    throw new HTTPError(400, `Invalid JSON value for query parameter "${parameter.name}".`)
  }
}

/**
 * 验证 body 内容
 */
export async function parseJSONBody<T>(route: Route, request: Request) {
  if (!route.body) throw new HTTPError(500, 'call parseJSONBody() need body parameter definition.')

  const body = await request.body.json()
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new HTTPError(400, 'Invalid JSON body, should be an object.')

  const res = validateParameters<T>(route.body, body as Record<string, unknown>)
  if (res.success) return res.data
  throw new HTTPError(400, res.error)
}
