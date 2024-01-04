/**
 * 把路由定义转换成 swagger API 定义的工具函数
 */
import type { RouteDefinition, ResponseDataType, BasicParameter } from '@/router/index.js'
import type { Schema, Reference, PathItem } from './openapi-spec.js'

type AnyObject = { [k: string]: unknown }

/**
 * 基本数据类型
 */
export function string(description?: string, options?: AnyObject) {
  return { type: 'string', description, ...(options ?? {}) }
}
export function number(description?: string, options?: AnyObject) {
  return { type: 'number', description, ...(options ?? {}) }
}
export function boolean(description?: string, options?: AnyObject) {
  return { type: 'boolean', description, ...(options ?? {}) }
}
export function object(properties: Record<string, Schema>, extra?: AnyObject) {
  return { type: 'object' as const, properties, ...(extra ?? {}) }
}
export function array(items: Schema, extra?: AnyObject) {
  return { type: 'array' as const, items, ...(extra ?? {}) }
}

/**
 * 对 components/schemas 中定义的数据类型的引用
 */
export function ref(name: string, summary?: string, description?: string): Reference {
  return { $ref: '#/components/schemas/' + name, summary, description }
}

/**
 * 可放置于 components/schemas 中的数据类型定义（用于响应内容）
 */
export function responseSchema(type: ResponseDataType | ResponseDataType[]): Schema | Reference {
  if (Array.isArray(type)) {
    return {
      oneOf: type
        .filter((subType): subType is Exclude<typeof subType, 'null'> => subType !== 'null')
        .map(responseSchema),
      nullable: type.includes('null'),
    }
  }

  if (typeof type === 'string') return { type }
  if ('ref' in type) return ref(type.ref, type.summary, type.description)
  if ('array' in type) return array(responseSchema(type.array))
  if ('object' in type) {
    return object(
      type.object.reduce(
        (properties, property) => ({
          ...properties,
          [property.name]: { ...responseSchema(property.type), description: property.description },
        }),
        {},
      ),
    )
  }

  return {}
}

/**
 * 可放置于 components/schemas 中的数据类型定义（用于请求内容）
 */
export function parameterSchema(parameter: BasicParameter): Schema {
  const schema: Schema = {
    description: parameter.description,
    nullable: parameter.nullable,
    default: parameter.defaults,
  }
  if (typeof parameter.type === 'string') {
    schema.type = parameter.type
  } else if ('array' in parameter.type) {
    const arraySchema = array(parameterSchema(parameter.type.array))
    Object.assign(schema, arraySchema)
  } else if ('record' in parameter.type) {
    const innerSchema = parameterSchema(parameter.type.record)
    Object.assign(schema, object({}, { additionalProperties: innerSchema }))
  } else if ('object' in parameter.type) {
    const objectSchema = object(
      Object.entries(parameter.type.object).reduce(
        (properties, [name, subParameter]) => ({
          ...properties,
          [name]: parameterSchema(subParameter),
        }),
        {},
      ),
    )
    Object.assign(schema, objectSchema)
  }
  return schema
}

/**
 * 生成 JSON 形式的 content
 */
export function jsonMedia(schema: string | Schema) {
  return {
    content: {
      'application/json': {
        schema: typeof schema === 'string' ? ref(schema) : schema,
      },
    },
  }
}

/**
 * 把一系列路由转换成 swagger API 定义
 */
export function paths(routes: RouteDefinition[]) {
  const paths: Record<string, PathItem> = {}

  for (const route of routes) {
    if (route.category === 'swagger') continue

    if (!paths[route.path]) paths[route.path] = {}
    const pathItem = paths[route.path]!
    const method = route.method.toLowerCase() as 'get'
    pathItem[method] = operation(route)
  }

  return paths
}

/**
 * 单个路由定义
 */
export function operation(route: RouteDefinition) {
  return {
    tags: route.category ? [route.category] : [],
    summary: route.description,
    operationId: operationId(route),
    parameters: queryParameters(route),
    requestBody: requestBody(route),
    responses: {
      default: {
        description: 'OK',
        ...jsonMedia(route.response !== undefined ? responseSchema(route.response) : object({})),
      },
    },
  }
}

/**
 * 生成路由的唯一 ID
 */
export function operationId(route: RouteDefinition) {
  return `${route.method}-${route.path}`
}

/**
 * 路由 query 参数转为 swagger 定义
 */
export function queryParameters(route: RouteDefinition) {
  if (!route.query) return
  return route.query.map(parameter => ({
    name: parameter.name,
    in: 'query' as const,
    description: parameter.description,
    required: parameter.required,
    schema: parameterSchema(parameter),
  }))
}

/**
 * 路由 body 参数转为 swagger 定义
 */
export function requestBody(route: RouteDefinition) {
  if (!route.body) return
  return jsonMedia({
    type: 'object',
    properties: route.body.reduce(
      (properties, parameter) => ({
        ...properties,
        [parameter.name]: parameterSchema(parameter),
      }),
      {},
    ),
  })
}
