// import fsPromise from 'node:fs/promises'
// import path from 'node:path'
// import { getAbsoluteFSPath } from 'swagger-ui-dist'
// import { HTTPError } from '@/http/index.js'
// import {
//   type Router,
//   type PathParameters,
//   type BaseContext,
//   type ResponseDataType,
// } from '@/router/index.js'
// import { normalizePath } from '@/router/match.js'
// import type { OpenAPI, Schema, PathItem } from './openapi-spec.js'

// export function registerSwaggerRoute(
//   router: Router,
//   endpoint: string = '/swagger',
//   customFields: OpenAPICustomFields = { info: { title: 'API Document', version: '0.0.1' } },
// ) {
//   router.register('GET', normalizePath(endpoint) + '/*', pageRoute)
//   router.register(
//     'GET',
//     normalizePath(endpoint) + '/api-swagger.json',
//     apiRoute.bind(null, router, customFields),
//   )
// }

// /**
//  * ---------------------------------
//  * swagger 页面路由
//  * ---------------------------------
//  */
// async function pageRoute({ response }: BaseContext, pathParameters: PathParameters) {
//   const file = (pathParameters['*'] ?? '') || 'index.html'

//   const swaggerDir = getAbsoluteFSPath()
//   const abspath = path.join(swaggerDir, file)
//   if (!cache.has(abspath)) {
//     try {
//       const stat = await fsPromise.stat(abspath)
//       if (!stat.isFile()) throw new HTTPError(404)
//     } catch (e) {
//       throw new HTTPError(404)
//     }
//     const content = await fsPromise.readFile(abspath)
//     const replacemented = replacement(abspath, content)
//     cache.set(abspath, replacemented)
//   }
//   response.text(cache.get(abspath)!)
// }

// const cache = new Map<string, Buffer | string>()

// function replacement(abspath: string, content: Buffer) {
//   if (/swagger-initializer.js/.exec(abspath)) {
//     return content
//       .toString()
//       .replace('https://petstore.swagger.io/v2/swagger.json', './api-swagger.json')
//     // .replace('SwaggerUIBundle({', 'SwaggerUIBundle({\n    defaultModelsExpandDepth: 1,\n    defaultModelExpandDepth: 1,')
//   }
//   return content
// }

// /**
//  * ---------------------------------
//  * swagger API 路由
//  * ---------------------------------
//  */
// type OpenAPICustomFields = Omit<OpenAPI, 'openapi' | 'paths' | 'components'>

// function apiRoute(router: Router, customFields: OpenAPICustomFields, { response }: BaseContext) {
//   const swaggerJSON: OpenAPI = {
//     ...customFields,
//     openapi: '3.1.0',
//     paths: makePaths(router),
//     components: {
//       schemas: makeRefs(router),
//     },
//   }
//   response.json(swaggerJSON)
// }

// function makeRefs(router: Router) {
//   const schemas: Record<string, Schema> = {}
//   for (const [id, type] of Object.entries(router.responseReferences)) {
//     schemas[id] = responseDataType2Schema(type)
//   }
//   return schemas
// }

// function makePaths(router: Router) {
//   const paths: Record<string, PathItem> = {}
//   return paths
// }

// function responseDataType2Schema(type: ResponseDataType): Schema {
//   if (type === 'null') return { nullable: true }
//   if (typeof type === 'object' && 'array' in type && type.array.includes('null')) {
//     return {
//       nullable: true,
//       ...responseDataType2Schema(type as ResponseDataType.filter(v => v !== 'null') as ResponseDataType),
//     }
//   }

//   const nullable = type === 'null' || (Array.isArray(type) && type.includes('null'))
//   return {
//     nullable,
//   }
// }

// type Obj = { [k: string]: unknown }
// function string(desc?: string, options?: Obj) {
//   return { type: 'string', description: desc, ...(options ?? {}) }
// }
// function number(desc?: string, options?: Obj) {
//   return { type: 'number', description: desc, ...(options ?? {}) }
// }
// function boolean(desc?: string, options?: Obj) {
//   return { type: 'boolean', description: desc, ...(options ?? {}) }
// }
// function object(properties: unknown, extra?: Obj) {
//   return { type: 'object', properties, ...(extra ?? {}) }
// }
// function array(items: unknown, extra?: Obj) {
//   return { type: 'array', items, ...(extra ?? {}) }
// }

// function ref(name: string) {
//   return { $ref: '#/components/schemas/' + name }
// }

// function jsonSchema(schema: string | Obj) {
//   return {
//     content: {
//       'application/json': {
//         schema: typeof schema === 'string' ? ref(schema) : schema,
//       },
//     },
//   }
// }

// function route(params: {
//   category: string
//   describe: string
//   path: string
//   body?: string | Obj
//   response?: string | Obj
// }) {
//   return {
//     [params.path]: {
//       post: {
//         tags: [params.category],
//         summary: params.describe,
//         operationId: params.path,
//         requestBody: params.body !== undefined ? jsonSchema(params.body) : undefined,
//         responses: {
//           default: {
//             description: 'OK',
//             ...jsonSchema(params.response ?? object({})),
//           },
//         },
//       },
//     },
//   }
// }

// function response(schema: unknown) {
//   return {
//     type: 'object',
//     properties: {
//       success: boolean(undefined, { enum: [true] }),
//       data: schema,
//     },
//   }
// }

// function pageResp(itemSchema: unknown) {
//   return response({
//     type: 'object',
//     properties: {
//       total: number(),
//       list: array(itemSchema),
//     },
//   })
// }
