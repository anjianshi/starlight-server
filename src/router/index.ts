import { type OptionalFields, joinPath } from '@anjianshi/utils'
import { getPreflightRequestMethod, handleCORS, type CORSRule } from '@/http/cors.js'
import { HTTPError, type Request, type ResponseUtils } from '@/http/index.js'
import { Swagger, type Method } from '@/swagger/index.js'
import {
  getRequestWithHelpers,
  getResponseUtilsWithHelpers,
  type RequestWithHelpers,
  type ResponseUtilsWithHelpers,
} from './helpers.js'
import { matchPath, type PathParameters } from './match-path.js'

export interface BasicContext {
  pathParameters: PathParameters
  request: RequestWithHelpers
  response: ResponseUtilsWithHelpers
}

/** 使用者可自行补充 Context 定义  */
export interface Context extends BasicContext {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export interface Route {
  method: Method
  path: string
  handler: (context: Context) => void | Promise<void>
  /** 接口文档（需 router 绑定 Swagger 实例才生效） */
  document?: Parameters<Swagger['registerOperation']>[2]
  /** 此接口的 CORS 规则 */
  cors?: CORSRule
}

export class Router {
  /**
   * ----------------------
   * 路由定义
   * ----------------------
   */
  readonly routes: Route[] = []

  register(inputRoute: OptionalFields<Route, 'method'>) {
    const route = { ...inputRoute, method: inputRoute.method ?? 'GET' }
    this.routes.push(route)
    this.registerRouteToSwagger(route)
  }

  /**
   * ----------------------
   * 全局 CORS 配置
   * ----------------------
   */
  private cors: CORSRule | ((request: Request) => CORSRule) = false
  setCors(rule: typeof this.cors) {
    this.cors = rule
  }

  /**
   * ----------------------
   * Swagger 配置
   * ----------------------
   */
  private _swagger: Swagger | null = null

  /**
   * 访问绑定到这个 router 的 Swagger 实例
   * （必须事先调用过 `router.bindSwagger()`）
   */
  get swagger() {
    if (!this._swagger) throw new Error('必须先绑定 Swagger 实例')
    return this._swagger
  }

  bindSwagger(swagger: Swagger = new Swagger(), endpoint = '/swagger') {
    if (this._swagger) throw new Error('不能重复绑定 Swagger 实例')
    this._swagger = swagger
    this.routes.forEach(this.registerRouteToSwagger.bind(this))
    this.routes.push({
      method: 'GET',
      path: joinPath(endpoint, '/*'),
      handler: async context => {
        if (context.pathParameters['*'] === undefined && !context.request.path.endsWith('/')) {
          context.response.redirect(joinPath(endpoint, '/'), true)
        } else {
          await swagger.output(context.response, context.pathParameters['*'])
        }
      },
    })
  }

  private registerRouteToSwagger(route: Route) {
    if (this._swagger)
      this._swagger.registerOperation(route.method, route.path, route.document ?? {})
  }

  /**
   * -------------------------------
   * route 调用 / context 配置
   * -------------------------------
   */
  protected executor = async (basicContext: BasicContext, route: Route) => {
    await route.handler(basicContext as Context)
  }
  setExecutor(executor: typeof this.executor) {
    this.executor = executor
  }

  /**
   * ----------------------
   * 请求处理
   * ----------------------
   */
  readonly handle = async (request: Request, response: ResponseUtils) => {
    const pathMatchedRoutes = matchPath(
      this.routes.map(route => route.path),
      request.path,
    ).map(result => ({ route: this.routes[result.index]!, parameters: result.parameters }))
    if (!pathMatchedRoutes.length) throw new HTTPError(404) // 没有路径匹配的路由

    const method = request.method // 请求的实际 method
    const matched = pathMatchedRoutes.find(match => match.route.method === method)
    if (!matched) {
      const preflightTargetMethod = getPreflightRequestMethod(request) // 对于 CORS Preflight 请求，此为客户端原本希望请求的 method
      const preflightMatched = pathMatchedRoutes.find(
        match => match.route.method === preflightTargetMethod,
      )
      if (preflightMatched) {
        const corsRule = preflightMatched.route.cors ?? this.cors
        handleCORS(request, response, typeof corsRule === 'function' ? corsRule(request) : corsRule)
        response.nodeResponse.end('')
        return
      }
      throw new HTTPError(405) // 有路径匹配的路由，但是没有 method 匹配的
    } else {
      const corsRule = matched.route.cors ?? this.cors
      handleCORS(request, response, typeof corsRule === 'function' ? corsRule(request) : corsRule)
    }

    const basicContext: BasicContext = {
      request: getRequestWithHelpers(request, matched.parameters),
      response: getResponseUtilsWithHelpers(response),
      pathParameters: matched.parameters,
    }

    const result = await (this.executor(basicContext, matched.route) as Promise<unknown>)
    if (result !== undefined) throw new Error('route handler 不应该有返回值')
  }
}
