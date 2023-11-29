/**
 * 匹配路由路径
 *
 * 支持的格式：
 * 1. /abc/ abc/ /abc => 这几种形式等价
 * 2. /abc/:foo/bar => 命名参数（foo）
 * 3. /abc/:foo?/bar => 可选命名参数（foo）
 * 4. /abc/* => 后续路径（任意长度，* 只能出现在路由最后面，匹配结果不含开头的“/”）
 *
 * 路由不区分大小写
 */
import escapeRegExp from 'lodash/escapeRegExp.js'

/**
 * 标准化路径
 * 标准化后，相同的两个路径一定也是相同的字符串（例如 /Abc/Def 和 abc/def/ 都会变成 abc/def）。
 *
 * - 移除首尾和重复的 '/'，完成后有 path 有这几种可能的格式： ''、'abc'、'abc/def'
 * - 统一改为小写
 */
export function normalizePath(path: string) {
  if (path.startsWith('/')) path = path.slice(1)
  if (path.endsWith('/')) path = path.slice(0, -1)
  path = path.replace(/\/+/g, '/')
  return path.toLowerCase()
}

/**
 * 解析路由路径定义
 * '/abc/:foo?/*' => [{ type: 'text', text: 'abc' }, { type: 'named', name: 'foo', optional: true }, { type: 'rest' }]
 */
function parseRoutePath(routePath: string): ParsedPath {
  const normalizedPath = normalizePath(routePath)

  const nodes: PathNode[] = []
  const pathParts = normalizedPath.split('/')
  for (const [i, part] of pathParts.entries()) {
    if (part.startsWith(':') && part !== ':' && part !== ':?') {
      const optional = part.endsWith('?')
      const name = optional ? part.slice(1, -1) : part.slice(1)
      if (name === '*') throw new Error('route path parameter name cannot be "*"')
      nodes.push({ type: PathNodeType.Named, name, optional })
    } else if (part === '*' && i === pathParts.length - 1) {
      nodes.push({ type: PathNodeType.Rest })
    } else {
      nodes.push({ type: PathNodeType.Text, text: part })
    }
  }

  return nodes
}

enum PathNodeType {
  /** 纯文本 */
  Text = 'text',
  /** 命名参数 */
  Named = 'named',
  /** 后续路径 */
  Rest = 'rest',
}
type PathNode =
  | { type: PathNodeType.Text; text: string }
  | { type: PathNodeType.Named; name: string; optional: boolean }
  | { type: PathNodeType.Rest }
type ParsedPath = PathNode[]

/**
 * 把路由定义转换成正则表达式
 *
 * Nodes                      | Path          | RegExp
 * -------------------------- | ------------- | ----------------------------
 * []                         |               | ^$
 * ['abc']                    | abc           | ^abc$
 * ['abc', named:foo, 'xyz']  | abc/:foo/xyz  | ^abc/([^/]+?)/xyz$
 * ['abc', named:foo?, 'xyz'] | abc/:foo?/xyz | ^abc(?:/([^/]+?))?/xyz$
 * ['abc', named:foo?, rest]  | abc/:foo?/*   | ^abc(?:/([^/]+?))?(?:/(.+))?$
 *
 * ^(?:/(.+))?$
 */
function parsedPathToRegExp(parsedPath: ParsedPath) {
  const regexpParts: string[] = []
  for (const node of parsedPath) {
    const prefix = node === parsedPath[0] ? '' : '/'
    if (node.type === PathNodeType.Text) {
      regexpParts.push(prefix + escapeRegExp(node.text))
    } else if (node.type === PathNodeType.Named) {
      regexpParts.push(node.optional ? `(?:${prefix}([^/]+?))?` : `${prefix}([^/]+?)`)
    } else {
      regexpParts.push(`(?:${prefix}(.+))?`)
    }
  }
  return new RegExp('^' + regexpParts.join('') + '$', 'i')
}

/**
 * 比较两个路径的优先级（两个路由都能匹配路径时，优先级更高的生效）
 *
 * pathA 优先：-1
 * pathB 优先：1
 *
 * 规则：
 * 1. 挨个 node 比对
 * 2. 先匹配各节点的类型，text > named > named optional > rest
 * 3. 节点类型都一致，节点数量多的优先级更高
 * 4. 节点类型、数量都一样，后出现的覆盖先出现的
 */
function pathSorter(pathA: ParsedPath, pathB: ParsedPath) {
  const typePriorities = [PathNodeType.Text, PathNodeType.Named, PathNodeType.Rest]

  const length = Math.max(pathA.length, pathB.length)
  for (let i = 0; i < length; i++) {
    const a = pathA[i]
    const b = pathB[i]

    // 若 nodes 长度不一样，长的优先
    if (a === undefined) return -1
    else if (b === undefined) return 1

    // node 类型不一样，按类型排序
    const aTypePriority = typePriorities.indexOf(a.type)
    const bTypePriority = typePriorities.indexOf(b.type)
    if (aTypePriority !== bTypePriority) return aTypePriority - bTypePriority

    // 若都是 named 类型但 optional 不同
    if (
      a.type === PathNodeType.Named &&
      b.type === PathNodeType.Named &&
      a.optional !== b.optional
    ) {
      return a.optional ? 1 : -1
    }
  }

  // 长度、类型都一样，后出现的优先
  return 1
}

/**
 * 返回匹配的路由及匹配上的路径参数
 */
export function matchRoutes<R extends BasicRoute>(requestPath: string, routes: R[]) {
  if (!parsedCache.has(routes)) {
    // 解析路由路径并按优先级排序
    const parsedRoutes = routes
      .map(route => {
        const parsedPath = parseRoutePath(route.path)
        const regexp = parsedPathToRegExp(parsedPath)
        return { parsedPath, regexp, route }
      })
      .sort((a, b) => pathSorter(a.parsedPath, b.parsedPath))
    parsedCache.set(routes, parsedRoutes)
  }

  requestPath = normalizePath(requestPath)
  const parsedRoutes = parsedCache.get(routes)!
  return parsedRoutes
    .map(({ parsedPath, regexp, route }) => {
      const match = regexp.exec(requestPath)
      if (!match) return null

      const pathParameters = matchPathParameters(parsedPath, [...match].slice(1))
      return { route, pathParameters } as RouteMatch<R>
    })
    .filter((matched): matched is Exclude<typeof matched, null> => matched !== null)
}
const parsedCache = new WeakMap<
  BasicRoute[], // eslint-disable-line @typescript-eslint/no-explicit-any
  { parsedPath: ParsedPath; regexp: RegExp; route: BasicRoute }[] // eslint-disable-line @typescript-eslint/no-explicit-any
>()

export type BasicRoute = { path: string }

export interface RouteMatch<R> {
  route: R
  pathParameters: PathParameters
}

/**
 * 把匹配到的路径参数映射成键值对
 * 没匹配到的内容（optional named node / rest node）值为 undefined
 */
function matchPathParameters(parsedPath: ParsedPath, parameterNames: (string | undefined)[]) {
  const parameters: PathParameters = {}
  for (const node of parsedPath) {
    if (node.type === PathNodeType.Text) continue
    else if (node.type === PathNodeType.Named) parameters[node.name] = parameterNames.shift()!
    else parameters['*'] = parameterNames.shift()!
  }
  return parameters
}
export type PathParameters = {
  [name: string]: string | undefined
  '*'?: string
}
