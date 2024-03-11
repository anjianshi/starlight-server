import fsPromise from 'node:fs/promises'
import path from 'node:path'
import { clearSlash } from '@anjianshi/utils'
import { isFileExists } from '@anjianshi/utils/env-node/index.js'
import defaultsDeep from 'lodash/defaultsDeep.js'
import { getAbsoluteFSPath } from 'swagger-ui-dist'
import { type ResponseUtils } from '@/http/index.js'
import * as factories from './factories.js'
import { type DocumentOptions, type OperationOptions } from './factories.js'
import type {
  OpenAPI,
  Schema,
  Response,
  Parameter,
  RequestBody,
  Method,
  LowerMethod,
  Operation,
} from './specification.js'

export * from './specification.js'

/**
 * 把 OpenAPI 文档输出成 Swagger 页面
 */
export class Swagger {
  /**
   * Swagger 页面配置
   * 支持的配置项见：https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
   */
  readonly uiConfig: Record<string, unknown> | null

  /**
   * OpenAPI 文档内容
   */
  readonly document: OpenAPI

  constructor(uiConfig?: Record<string, unknown>, document?: DocumentOptions) {
    this.uiConfig = uiConfig ?? null
    this.document = factories.makeDocument(document)
  }

  /**
   * 注册 Operation
   */
  registerOperation(method: Method, path: string, operation: Operation | OperationOptions) {
    if (factories.isOperationOptions(operation)) operation = factories.makeOperation(operation)

    defaultsDeep(this.document.paths, { [path]: {} })
    const pathItem = this.document.paths[path]!
    if ('$ref' in pathItem) throw new Error('接口文档注册失败，目标路径已注册为 Reference')
    pathItem[method.toLowerCase() as LowerMethod] = operation
  }

  /**
   * 注册 OpenAPI components 内容（以便后续引用）
   */
  registerSchema(name: string, content: Schema) {
    defaultsDeep(this.document, { components: { schemas: {} } })
    this.document.components!.schemas![name] = content
  }
  registerResponse(name: string, content: Response) {
    defaultsDeep(this.document, { components: { responses: {} } })
    this.document.components!.responses![name] = content
  }
  registerParameter(name: string, content: Parameter) {
    defaultsDeep(this.document, { components: { parameters: {} } })
    this.document.components!.parameters![name] = content
  }
  registerRequestBody(name: string, content: RequestBody) {
    defaultsDeep(this.document, { components: { requestBodies: {} } })
    this.document.components!.requestBodies![name] = content
  }

  /**
   * factories
   */
  operation = factories.makeOperation
  query = factories.makeQuery
  header = factories.makeHeader
  body = factories.makeBody
  responses = factories.makeResponses
  response = factories.makeResponse
  string = factories.makeString
  number = factories.makeNumber
  integer = factories.makeInteger
  boolean = factories.makeBoolean
  null = factories.makeNull
  array = factories.makeArray
  object = factories.makeObject
  nullable = factories.makeNullable
  maySuccess = factories.makeMaySuccess
  ref = factories.makeReference

  /**
   * 输出 Swagger 内容
   * Swagger 内容包含 HTML、各类资源文件和接口数据 JSON，都通过此方法输出，此方法通过 filepath 判断要输出什么。
   */
  private readonly fileCache = new Map<string, string>()
  async output(response: ResponseUtils, filepath: string = '') {
    filepath = clearSlash(filepath)

    // 输出接口 JSON 数据
    if (filepath === 'api-swagger.json') return void response.json(this.document)

    // 输出 Swagger 静态文件内容
    const swaggerDir = getAbsoluteFSPath()
    const abspath = path.join(swaggerDir, filepath || 'index.html')
    if (!this.fileCache.has(abspath)) {
      if (!(await isFileExists(abspath))) return void response.error(404)

      let content = (await fsPromise.readFile(abspath)).toString()
      if (filepath.endsWith('swagger-initializer.js')) {
        content = content.replace(
          'https://petstore.swagger.io/v2/swagger.json',
          './api-swagger.json'
        )
        if (this.uiConfig) {
          content = content.replace(
            'SwaggerUIBundle({',
            'SwaggerUIBundle({\n    ' + JSON.stringify(this.uiConfig).slice(1, -1) + ',\n'
          )
        }
      }
      this.fileCache.set(abspath, content)
    }
    response.file(this.fileCache.get(abspath)!, abspath)
  }
}
