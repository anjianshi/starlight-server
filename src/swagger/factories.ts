/**
 * 用更符合日常习惯的参数格式，快捷生成各类 OpenAPI 定义
 */
import { truthy, type OptionalFields } from '@anjianshi/utils'
import defaultsDeep from 'lodash/defaultsDeep.js'
import pick from 'lodash/pick.js'
import type {
  OpenAPI,
  Schema,
  Operation,
  Responses,
  Response,
  Reference,
  Parameter,
  RequestBody,
} from './specification.js'

type SchemaOrRef = Schema | Reference

/**
 * ---------------------
 * OpenAPI Document
 * ---------------------
 */
export type DocumentOptions = Omit<OptionalFields<OpenAPI, 'openapi' | 'paths'>, 'info'> & {
  info?: Partial<OpenAPI['info']>
}
export function makeDocument(options?: DocumentOptions) {
  return defaultsDeep(options ?? {}, {
    openapi: '3.1.0',
    paths: {},
    info: { title: 'API Document', version: '0.0.1' },
  }) as OpenAPI
}

/**
 * ---------------------
 * Operation
 * ---------------------
 */

export function makeOperation(options: OperationOptions = {}): Operation {
  const { category, query, body, response } = options
  const parameters = Array.isArray(query)
    ? query
    : query
      ? Object.entries(query).reduce<Parameter[]>((result, [name, options]) => {
          const query = makeQuery({
            name,
            ...('schema' in options ? options : { schema: options }),
          })
          return [...result, query]
        }, [])
      : undefined
  const requestBody = body ? ('$ref' in body ? (body as Reference) : makeBody(body)) : undefined
  const responses = response
    ? '$ref' in response
      ? makeResponsesBy(response)
      : makeResponses(response)
    : undefined
  return {
    tags: category !== undefined ? [category] : [],
    summary: options.summary,
    description: options.description,
    parameters,
    requestBody,
    responses,
  }
}
export interface OperationOptions extends Pick<Operation, 'summary' | 'description'> {
  category?: string
  query?: (Parameter | Reference)[] | { [name: string]: Schema | Omit<ParameterOptions, 'name'> }
  /** 用来构建 RequestBody 的选项值，或引用某个 **RequestBody** 的 Reference */
  body?: Parameters<typeof makeBody>[0] | Reference
  /** 用来构建 Response 的选项值，或引用某个 **Response** 的 Reference */
  response?: Parameters<typeof makeResponse>[0] | Reference
}

/** 判断一个对象是不是 OperationOptions */
export function isOperationOptions(value: unknown): value is OperationOptions {
  if (typeof value !== 'object' || value === null) return false
  return (
    ['category', 'query', 'body', 'response'].find(key =>
      truthy((value as Record<string, unknown>)[key]),
    ) !== undefined
  )
}

/**
 * -------------------------------
 * Request
 * -------------------------------
 */

interface ParameterOptions {
  name: string
  description?: string
  required?: boolean
  schema: SchemaOrRef
}

/** 生成 query 定义 */
export function makeQuery(options: ParameterOptions): Parameter {
  return { ...options, in: 'query' }
}

/** 生成 header 定义 */
export function makeHeader(options: ParameterOptions): Parameter {
  return { ...options, in: 'header' }
}

/**
 * 生成 RequestBody 定义，假定 body 通过 JSON 传递且内容是一个对象。
 * input 支持的传值：
 * 1. 生成 object Schema 所需的 properties 定义或完整选项值（ObjectOptions）
 * 2. 已生成的 object Schema
 *
 */
export function makeBody(
  input: Record<string, SchemaOrRef> | ObjectOptions | Schema,
  description?: string,
): RequestBody {
  return {
    description,
    content: {
      'application/json': {
        schema: isSchema(input) ? input : makeObject(input),
      },
    },
    required: true,
  }
}

/**
 * -------------------------------
 * Responses / Response
 * -------------------------------
 */

/** 传入 Schema 来生成 Responses 定义 */
export function makeResponses(schema: Schema, description?: string): Responses {
  return {
    200: makeResponse(schema, description),
  }
}

/** 传入已存在的 Response 定义来生成 Responses 定义 */
export function makeResponsesBy(response: Response | Reference): Responses {
  return {
    200: response,
  }
}

/** 生成 Response 定义 */
export function makeResponse(
  schema: Schema | Record<string, SchemaOrRef>,
  description?: string,
): Response {
  return {
    description,
    content: {
      'application/json': {
        schema: isSchema(schema) ? schema : makeObject(schema),
      },
    },
  }
}

/**
 * -------------------------------
 * Schema
 * -------------------------------
 */

/** 判断一个对象是不是 Schema */
export function isSchema(value: unknown): value is Schema {
  if (typeof value !== 'object' || value === null) return false
  return (
    ['type', 'allOf', 'anyOf', 'oneOf', 'not'].find(key =>
      truthy((value as Record<string, unknown>)[key]),
    ) !== undefined
  )
}

/** Schema 通用参数 */
type SchemaCommonOptions = Pick<Schema, 'title' | 'description' | 'default' | 'enum'>
function pickSchemaCommon<T extends SchemaCommonOptions>(options: T) {
  return pick(options, 'title', 'description', 'default', 'enum')
}

/** 生成 string Schema */
export function makeString(options: StringOptions = {}): Schema {
  return {
    ...pickSchemaCommon(options),
    type: 'string',
    minLength: options.min,
    maxLength: options.max,
    pattern: options.pattern,
  }
}
interface StringOptions extends SchemaCommonOptions {
  min?: number
  max?: number
  pattern?: string
}

/** 生成 number Schema */
export function makeNumber(options: NumberOptions = {}): Schema {
  return {
    ...pickSchemaCommon(options),
    type: 'number',
    minimum: options.min,
    maximum: options.max,
  }
}
/** 生成 integer Schema */
export function makeInteger(options: NumberOptions = {}): Schema {
  return {
    ...makeNumber(options),
    type: 'integer',
  }
}
interface NumberOptions extends SchemaCommonOptions {
  min?: number
  max?: number
}

/** 生成 boolean Schema */
export function makeBoolean(options?: SchemaCommonOptions): Schema {
  return { ...options, type: 'boolean' }
}

/** 生成 null Schema */
export function makeNull(options?: SchemaCommonOptions): Schema {
  return { ...options, type: 'null' }
}

/**
 * 生成 array Schema
 * 可以直接传入 item 定义，也可以传入完整 options 对象
 */
export function makeArray(rawOptions: SchemaOrRef | ArrayOptions): Schema {
  const options = !('items' in rawOptions) ? { items: rawOptions } : (rawOptions as ArrayOptions)
  return {
    ...pickSchemaCommon(options),
    type: 'array',
    items: options.items,
    minItems: options.min,
    maxItems: options.max,
    uniqueItems: options.unique,
  }
}
interface ArrayOptions extends SchemaCommonOptions {
  items: SchemaOrRef
  min?: number
  max?: number
  unique?: boolean
}

/**
 * 生成 object Schema
 * 可以直接传入 properties 定义，也可以传入完整 options 对象
 */
export function makeObject(rawOptions: Record<string, SchemaOrRef> | ObjectOptions): Schema {
  const options = !('properties' in rawOptions)
    ? { properties: rawOptions }
    : (rawOptions as ObjectOptions)
  return {
    ...pickSchemaCommon(options),
    type: 'object',
    properties: options.properties,
    required: options.required,
  }
}
interface ObjectOptions extends SchemaCommonOptions {
  properties: Record<string, SchemaOrRef>
  required?: string[]
}

/** 指明一个值可能为 null，即转换为 { oneOf: [Schema, nullSchema] } */
export function makeNullable(schema: SchemaOrRef): Schema {
  if ('$ref' in schema) return { oneOf: [schema, makeNull()] }
  const { title, description, ...restSchema } = schema
  return { title, description, oneOf: [restSchema, makeNull()] }
}

/**
 * 生成内容是 MaySuccess 格式的 object Schema
 * （对 MaySuccess 的定义见 @anjianshi/utils/lang/may-success.ts）
 */
interface MaySuccessOptions extends SchemaCommonOptions {
  /** 成功时的数据格式 */
  data: SchemaOrRef
  /** 失败时的 data 字段格式（通常用不到） */
  failed?: SchemaOrRef
}
export function makeMaySuccess(options: SchemaOrRef | MaySuccessOptions): Schema {
  const { data, failed, ...restOptions } =
    'data' in options ? options : { data: options, failed: undefined }
  const successSchema = makeObject({
    title: '成功结果',
    properties: {
      success: makeBoolean({ enum: [true] }),
      data,
    },
  })
  const failedSchema = makeObject({
    title: '失败结果',
    properties: {
      success: makeBoolean({ enum: [false] }),
      message: makeString(),
      code: { oneOf: [makeString(), makeNumber()] },
      ...(failed ? { data: failed } : {}),
    },
  })
  return {
    ...pickSchemaCommon(restOptions),
    oneOf: [successSchema, failedSchema],
  }
}

/**
 * -------------------------------
 * Ref
 * -------------------------------
 */
function makeReference(target: keyof typeof referenceTargets, name: string): Reference
function makeReference(uri: string): Reference
function makeReference(target: string, uri?: string) {
  if (typeof uri === 'string') {
    const name = uri
    return {
      $ref: `#/components/${referenceTargets[target as keyof typeof referenceTargets]}/${name}`,
    }
  } else {
    const uri = target
    return { $ref: uri }
  }
}
export { makeReference }
const referenceTargets = {
  schema: 'schemas',
  response: 'responses',
  parameter: 'parameters',
  body: 'requestBodies',
  header: 'headers',
}
