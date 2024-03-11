/**
 * 实现路径的模式匹配
 * match(pattern, path) => match-result
 *
 * [支持的模式]
 * 普通模式       | /abc/           | /abc/                             |
 * 命名参数       | /abc/:foo/bar   | /abc/123/bar => { foo: '123' }    |
 * 可选的命名参数 | /abc/:foo?/bar  | /abc/bar => {}                    | 可选参数若未传值，不会出现在匹配结果里
 * 后续路径       | /abc/*          | /abc/123/456 => { *: '123/456' }  | * 只有出现在路由最后面时生效，可匹配任意长度内容，匹配结果不含开头的“/”
 *
 * [通用规则]
 * - “模式”和“待匹配路径”开头结尾的 "/" 均不影响匹配。例如模式 /abc 可以和路径 abc/ 匹配。
 * - 不区分大小写
 */
import { clearSlash } from '@anjianshi/utils'
import escapeRegExp from 'lodash/escapeRegExp.js'

// 经过解析的模式节点
type PatternNode =
  | { type: NodeType.Text; text: string }
  | { type: NodeType.Named; name: string; optional: boolean }
  | { type: NodeType.Rest }

enum NodeType {
  Text = 'text', // 纯文本
  Named = 'named', // 命名参数
  Rest = 'rest', // 后续路径
}

// 匹配结果
export interface MatchResult {
  index: number
  pattern: string
  parameters: PathParameters
}

// 匹配得到的参数值
export type PathParameters = {
  [name: string]: string | undefined
  '*'?: string
}

// -----------------------------------------------------

/**
 * 返回与路径匹配的 pattern 及匹配得到的参数值
 */
export function matchPath(patterns: string[], path: string) {
  // 解析 pattern 并按优先级排序
  const parsedPatterns = patterns
    .map((pattern, index) => {
      if (patternCache.has(pattern)) return { index, pattern, ...patternCache.get(pattern)! }
      const nodes = parsePattern(pattern)
      const regexp = patternToRegExp(nodes)
      patternCache.set(pattern, { nodes, regexp })
      return { index, pattern, nodes, regexp }
    })
    .sort((a, b) => patternSorter(a.nodes, b.nodes))

  path = clearSlash(path)
  return parsedPatterns
    .map(({ index, pattern, nodes, regexp }) => {
      const match = regexp.exec(path)
      if (!match) return null
      const parameters = formatMatchParameters(nodes, [...match].slice(1))
      return { index, pattern, parameters } as MatchResult
    })
    .filter((matched): matched is Exclude<typeof matched, null> => matched !== null)
}
const patternCache = new Map<string, { nodes: PatternNode[]; regexp: RegExp }>()

/**
 * 整理 pattern regexp 与路径匹配得到的参数值，按 pat节点定义，把正则匹配结果转换成参数值对象。
 * 对于 `{ type: 'named', optional: true }` 或 `{ type: 'rest }` 的节点，若没有匹配到的值，则值为 undefined。
 */
function formatMatchParameters(pattern: PatternNode[], values: (string | undefined)[]) {
  const parameters: PathParameters = {}
  for (const node of pattern) {
    if (node.type === NodeType.Text) continue
    else if (node.type === NodeType.Named) parameters[node.name] = values.shift()!
    else parameters['*'] = values.shift()!
  }
  return parameters
}

/**
 * 解析 pattern
 * '/abc/:foo?/*' => [
 *   { type: 'text', text: 'abc' },
 *   { type: 'named', name: 'foo', optional: true },
 *   { type: 'rest' }
 * ]
 */
function parsePattern(pattern: string): PatternNode[] {
  pattern = clearSlash(pattern)
  const nodes: PatternNode[] = []
  const patternParts = pattern.split('/')
  for (const [i, part] of patternParts.entries()) {
    if (part.startsWith(':') && part !== ':' && part !== ':?') {
      const optional = part.endsWith('?')
      const name = optional ? part.slice(1, -1) : part.slice(1)
      if (name === '*') throw new Error('pattern parameter name cannot be "*"')
      nodes.push({ type: NodeType.Named, name, optional })
    } else if (part === '*' && i === patternParts.length - 1) {
      nodes.push({ type: NodeType.Rest })
    } else {
      nodes.push({ type: NodeType.Text, text: part })
    }
  }
  return nodes
}

/**
 * 把 pattern 转换成正则表达式
 *
 * Nodes                      | Pattern       | RegExp
 * -------------------------- | ------------- | ----------------------------
 * []                         |               | ^$
 * ['abc']                    | abc           | ^abc$
 * ['abc', named:foo, 'xyz']  | abc/:foo/xyz  | ^abc/([^/]+?)/xyz$
 * ['abc', named:foo?, 'xyz'] | abc/:foo?/xyz | ^abc(?:/([^/]+?))?/xyz$
 * ['abc', named:foo?, rest]  | abc/:foo?/*   | ^abc(?:/([^/]+?))?(?:/(.+))?$
 */
function patternToRegExp(pattern: PatternNode[]) {
  const regexpParts: string[] = []
  for (const node of pattern) {
    const prefix = node === pattern[0] ? '' : '/'
    if (node.type === NodeType.Text) {
      regexpParts.push(prefix + escapeRegExp(node.text))
    } else if (node.type === NodeType.Named) {
      regexpParts.push(node.optional ? `(?:${prefix}([^/]+?))?` : `${prefix}([^/]+?)`)
    } else {
      regexpParts.push(`(?:${prefix}(.+))?`)
    }
  }
  return new RegExp('^' + regexpParts.join('') + '$', 'i')
}

/**
 * 比较 pattern 的优先级（两个 pattern 都与路径匹配时，优先级更高的生效）
 *
 * 返回值：
 * - patternA 优先：-1
 * - patternB 优先：1
 * - 优先级完全一样，返回 1，即后出现的优先
 *
 * 规则：
 * 1. 挨个 node 比对
 * 2. 先匹配各节点的类型，text > named > named optional > rest
 * 3. 节点类型都一致，节点数量多的优先级更高
 * 4. 节点类型、数量都一样，后出现的覆盖先出现的
 */
function patternSorter(patternA: PatternNode[], patternB: PatternNode[]) {
  const typePriorities = [NodeType.Text, NodeType.Named, NodeType.Rest]

  const length = Math.max(patternA.length, patternB.length)
  for (let i = 0; i < length; i++) {
    const a = patternA[i]
    const b = patternB[i]

    // 若 nodes 长度不一样，长的优先
    if (a === undefined) return -1
    else if (b === undefined) return 1

    // node 类型不一样，按类型排序
    const aTypePriority = typePriorities.indexOf(a.type)
    const bTypePriority = typePriorities.indexOf(b.type)
    if (aTypePriority !== bTypePriority) return aTypePriority - bTypePriority

    // 若都是 named 类型但 optional 不同
    if (a.type === NodeType.Named && b.type === NodeType.Named && a.optional !== b.optional) {
      return a.optional ? 1 : -1
    }
  }

  // 长度、类型都一样，后出现的优先
  return 1
}
