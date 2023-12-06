import { type RequiredFields } from '@anjianshi/utils'
import { type Request, type ResponseUtils, HTTPError } from '@/http/index.js'
import { getMethodFromCORSPreflight, outputCORSHeaders, type CORSOptions } from './cors.js'
import { matchRoutes, type PathParameters, type RouteMatch } from './match.js'
import { parseQuery, parseJSONBody, type BasicDataType, type Parameter } from './parameters.js'

/**
 * -----------------------------------------
 * 类型定义
 * -----------------------------------------
 */

/**
 * 请求上下文（由 Router 生成并传给请求处理函数）
 */
export interface BaseContext {
  request: Request
  response: ResponseUtils
  parseQuery: <T>() => T
  parseBody: <T>() => Promise<T>
}

/**
 * 请求处理函数
 */
export type RouteHandler<
  Ctx extends BaseContext = BaseContext,
  PathP extends PathParameters = PathParameters,
> = (context: Ctx, pathParameters: PathP) => unknown

/**
 * 路由定义
 *
 * 相比 RawRoute：
 * - 有默认值的字段均填充了默认值
 * - method 一定为全大写
 */
export type Route<
  Ctx extends BaseContext = BaseContext,
  PathP extends PathParameters = PathParameters,
> = RequiredFields<RawRoute<Ctx, PathP>, 'description' | 'category' | 'method'>
export type RouteDefinition = Omit<Route, 'handler'> // 仅含定义，不含实现

export interface RawRoute<
  Ctx extends BaseContext = BaseContext,
  PathP extends PathParameters = PathParameters,
> {
  /** 接口路径。支持变量（/abc/:xxx/def），详见 src/router/match.ts */
  path: string

  /** 接口描述  */
  description?: string

  /** 接口类别 */
  category?: string

  /** 接口 HTTP Method，有 body 定义的默认为 POST，否则默认为 GET */
  method?: string

  /** Query String 定义  */
  query?: Parameter[]

  /** JSON Request Body 定义 */
  body?: Parameter[]

  /**
   * JSON 返回内容定义（返回的不是 JSON 时（如纯文本、二进制文件），不定义此项）
   * - 若指定的是 ResponseDataType[]，代表有多种可能返回的类型。例如 ['string' | 'null'] 可能返回字符串也可能返回 null
   */
  response?: ResponseDataType | ResponseDataType[]

  /**
   * 指定此接口的 CORS 配置
   * 不指定则由 router.getCORSOptions() 提供
   */
  cors?: CORSOptions

  handler: RouteHandler<Ctx, PathP>
}

/**
 * JSON 响应内容的类型定义
 * { array: ResponseDataType[] } 代表数组元素有多种可能的类型
 */
export type ResponseDataType =
  | BasicDataType
  | 'null'
  | { array: ResponseDataType | ResponseDataType[] }
  | { object: ResponseObjectItemType[] }
  | { ref: string; summary?: string; description?: string } // 引用预注册了的类型，以重用类型定义

/**
 * JSON object 相应内容的字段定义
 */
export interface ResponseObjectItemType {
  /** 字段名 */
  name: string

  /** 文字描述  */
  description?: string

  /** 值类型。ResponseDataType[] 代表有多种可能的类型 */
  type: ResponseDataType | ResponseDataType[]
}

/**
 * -----------------------------------------
 * Router 类
 * -----------------------------------------
 */

export abstract class Router<Ctx extends BaseContext = BaseContext> {
  /**
   * 路由列表
   */
  readonly routes: Route<Ctx>[] = []

  /**
   * 注册路由
   */
  register<P = Record<string, never>>(
    method: string,
    path: string,
    handler: RouteHandler<Ctx, PathParameters & P>,
  ): void
  register<P extends Record<string, string>>(raw: RawRoute<Ctx, PathParameters & P>): void
  register<P extends PathParameters = PathParameters>(
    raw: RawRoute<Ctx, PathParameters & P> | string,
    path?: string,
    handler?: RouteHandler<Ctx, PathParameters & P>,
  ) {
    const rawRoute: RawRoute<Ctx, PathParameters & P> =
      typeof raw === 'string' ? { method: raw, path: path!, handler: handler! } : raw
    const route: Route<Ctx, PathParameters & P> = {
      description: '',
      category: '',
      ...rawRoute,
      method: (rawRoute.method ?? (rawRoute.body ? 'POST' : 'GET')).toUpperCase(),
    }
    this.routes.push(route as Route<Ctx>)
  }

  /**
   * 响应请求
   */
  readonly handle = async (request: Request, response: ResponseUtils) => {
    const matched = this.match(request, response)
    if (matched === null) return

    const baseContext = getBaseContext(matched.route as Route, request, response)
    await this.executeWithContext(baseContext, matched.route, matched.pathParameters)
  }

  /**
   * 匹配路由，成功返回路由对象，失败抛出 HTTPError，提前结束处理返回 null
   */
  protected match(request: Request, response: ResponseUtils) {
    const matches = matchRoutes(request.path, this.routes)
    if (!matches.length) throw new HTTPError(404)

    const methodFromPreflight = getMethodFromCORSPreflight(request)
    const isPreflight = methodFromPreflight !== null

    const method = methodFromPreflight ?? request.method
    const methodMatched = matches.find(match => match.route.method === method)
    if (!methodMatched) throw new HTTPError(405)

    const corsOptions = methodMatched.route.cors ?? this.getCORSOptions(request, methodMatched)
    outputCORSHeaders(response, corsOptions, isPreflight)
    if (isPreflight) {
      response.nodeResponse.end('')
      return null
    }

    return methodMatched
  }

  /**
   * 为未指定 CORS 配置的 route 提供默认配置
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCORSOptions(request: Request, routeMatch: RouteMatch<Route<Ctx>>) {
    return false
  }

  /**
   * 完善 context 对象并执行 route
   * 注意：handler 在很多时候都是异步的，要用 await 等待执行完成
   */
  protected abstract executeWithContext(
    baseContext: BaseContext,
    route: Route<Ctx>,
    pathParameters: PathParameters,
  ): void | Promise<void>

  /**
   * response 定义中可引用的数据类型
   */
  readonly responseReferences: Record<string, ResponseDataType> = {}

  /**
   * 注册 response 定义中引用的数据类型
   */
  registerResponseReference(id: string, type: ResponseDataType) {
    this.responseReferences[id] = type
  }
}

/**
 * ------------------------
 * 默认实现
 * ------------------------
 */

/**
 * 基础 Context 实现
 */
function getBaseContext(route: Route, request: Request, response: ResponseUtils) {
  return {
    request,
    response,
    parseQuery: <T>() => parseQuery<T>(route, request),
    parseBody: async <T>() => parseJSONBody<T>(route, request),
  }
}

/**
 * 默认的 Router 实现
 */
export class DefaultRouter extends Router {
  async executeWithContext(baseContext: BaseContext, route: Route, pathParameters: PathParameters) {
    await route.handler(baseContext, pathParameters)
  }
}
