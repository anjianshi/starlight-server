import fsPromise from 'node:fs/promises'
import path from 'node:path'
import { getAbsoluteFSPath } from 'swagger-ui-dist'
import { HTTPError } from '@/http/index.js'
import type { Router, PathParameters, BaseContext } from '@/router/index.js'
import { normalizePath } from '@/router/match.js'
import * as factory from './factory.js'
import type { OpenAPI } from './openapi-spec.js'

export function registerSwaggerRoute(
  router: Router,
  endpoint: string = '/swagger',
  customFields: OpenAPICustomFields = { info: { title: 'API Document', version: '0.0.1' } },
  swaggerOptions?: Record<string, unknown>,
) {
  router.register({
    category: 'swagger',
    method: 'GET',
    path: normalizePath(endpoint) + '/*',
    handler: pageRoute.bind(null, swaggerOptions),
  })
  router.register({
    category: 'swagger',
    method: 'GET',
    path: normalizePath(endpoint) + '/api-swagger.json',
    handler: apiRoute.bind(null, router, customFields),
  })
}

/**
 * swagger 页面路由
 */
async function pageRoute(
  swaggerOptions: Record<string, unknown> | undefined, // Example: { defaultModelsExpandDepth: 1, defaultModelExpandDepth: 1 }
  { response }: BaseContext,
  pathParameters: PathParameters,
) {
  const file = (pathParameters['*'] ?? '') || 'index.html'

  const swaggerDir = getAbsoluteFSPath()
  const abspath = path.join(swaggerDir, file)
  if (!cache.has(abspath)) {
    try {
      const stat = await fsPromise.stat(abspath)
      if (!stat.isFile()) throw new HTTPError(404)
    } catch (e) {
      throw new HTTPError(404)
    }
    const content = await fsPromise.readFile(abspath)
    const replacemented = replacement(abspath, content, swaggerOptions)
    cache.set(abspath, replacemented)
  }
  response.text(cache.get(abspath)!)
}

const cache = new Map<string, Buffer | string>()

function replacement(abspath: string, content: Buffer, swaggerOptions?: Record<string, unknown>) {
  if (/swagger-initializer.js/.exec(abspath)) {
    let formatted = content
      .toString()
      .replace('https://petstore.swagger.io/v2/swagger.json', './api-swagger.json')
    if (swaggerOptions) {
      formatted = formatted.replace(
        'SwaggerUIBundle({',
        'SwaggerUIBundle({\n    ' + JSON.stringify(swaggerOptions).slice(1, -1) + ',\n',
      )
    }
    return formatted
  }
  return content
}

/**
 * swagger API 路由
 */
type OpenAPICustomFields = Omit<OpenAPI, 'openapi' | 'paths' | 'components'>

function apiRoute(router: Router, customFields: OpenAPICustomFields, { response }: BaseContext) {
  const swaggerJSON: OpenAPI = {
    ...customFields,
    openapi: '3.1.0',
    paths: factory.paths(router.routes),
    components: {
      schemas: Object.entries(router.responseReferences).reduce(
        (schemas, [name, type]) => ({ ...schemas, [name]: factory.responseSchema(type) }),
        {},
      ),
    },
  }
  response.json(swaggerJSON)
}
