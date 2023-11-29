/**
 * OpenAPI Specification
 * https://swagger.io/specification/
 */

export interface OpenAPI {
  openapi: '3.1.0'
  info: Info
  servers?: Server[]
  paths: Paths
  components?: Components
  security?: SecurityRequirement[]
  tags?: Tag[]
  externalDocs?: ExternalDocumentation
}

export interface Info extends Extendable {
  title: string
  summary?: string
  description?: string
  termsOfService?: string
  contact?: Contact
  license?: License
  // 此文档的版本（注意不是 OpenAPI 规范的版本）
  // Version of this API Document (Not OpenAPI Spec Version)
  version: string
}

export interface Contact extends Extendable {
  name?: string
  url?: string
  email?: string
}

export interface License extends Extendable {
  name: string
  url?: string
}

export interface Server extends Extendable {
  url: string
  description?: CommonMark
  variables?: Record<string, ServerVariable> // 插入到 url 中的变量
}

export interface ServerVariable extends Extendable {
  enum?: [string] & string[] // 此变量的可选值，不指定则变量可以是任意值，若指定则不允许为空数组（不然就变成所有值都不允许了）
  default: string // 此变量的默认值
  description: CommonMark
}

export interface Components extends Extendable {
  schemas?: Record<string, Schema>
  responses?: Record<string, Response | Reference>
  parameters?: Record<string, Parameter | Reference>
  examples?: Record<string, Example | Reference>
  requestBodies?: Record<string, RequestBody | Reference>
  headers?: Record<string, Header | Reference>
  securitySchemes?: Record<string, SecurityScheme | Reference>
  links?: Record<string, Link | Reference>
  callbacks?: Record<string, Callback | Reference>
  pathItems?: Record<string, PathItem | Reference>
}

export interface Paths extends Extendable {
  [path: string]: PathItem // path 须以 '/' 开头
}

export interface PathItem extends Extendable {
  $ref?: string
  summary?: string // 此路径接口的简短描述（对所有 method 均生效）
  description?: CommonMark // 此路径接口的详细描述（对所有 method 均生效）
  get?: Operation
  put?: Operation
  post?: Operation
  delete?: Operation
  options?: Operation
  head?: Operation
  patch?: Operation
  trace?: Operation
  servers?: Server[]
  parameters?: (Parameter | Reference)[]
}

export interface Operation {
  tags?: string[] // 接口分组
  summary?: string
  description?: CommonMark
  externalDocs?: ExternalDocumentation
  operationId?: string
  parameters?: (Parameter | Reference)[]
  requestBody?: RequestBody | Reference
  responses: Responses
  callbacks?: Record<string, Callback | Reference>
  deprecated?: boolean
}

export interface ExternalDocumentation {
  description?: CommonMark
  url: string
}

export interface Parameter extends Extendable {
  name: string
  in: ParameterLocation
  description?: CommonMark
  required?: boolean // in 为 'path' 时必须为 true
  deprecated?: boolean
  allowEmptyValue?: boolean // 仅 in 为 'query' 时有效，是否允许传空值

  // 定义简单场景的参数
  style?: ParameterStyle
  explode?: boolean
  allowReserved?: boolean
  schema?: Schema | Reference
  example?: unknown
  examples?: Record<string, Example | Reference>

  // 定义复杂场景的参数
  content?: Record<string, MediaType> // MIMEType => MediaType
}
export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie'
export type ParameterStyle = string

export interface RequestBody extends Extendable {
  description?: CommonMark
  content: Record<string, MediaType> // MIMEType => MediaType
  required?: boolean // body 内容是否必须
}

export interface MediaType extends Extendable {
  schema?: Schema | Reference
  example?: unknown
  examples?: Record<string, Example | Reference>
  encoding?: Record<string, Encoding>
}

export interface Encoding extends Extendable {
  contentType?: string // MIME Type。支持通配符（image/*），可用逗号分隔多项（image/jpg,image/png）
  headers?: Record<string, Header | Reference>
  style?: ParameterStyle
  explode?: boolean
  allowReserved?: boolean
}

export interface Responses extends Extendable {
  default: Response | Reference
  [HTTPStatus: string]: Response | Reference
}

export interface Response extends Extendable {
  descriptoin: CommonMark
  headers?: Record<string, Header | Reference>
  content?: Record<string, MediaType>
  links?: Record<string, Link | Reference>
}

export interface Callback extends Extendable {
  [expression: Expression]: PathItem
}

export interface Example extends Extendable {
  summary?: string
  description?: CommonMark
  value?: unknown
  externalValue?: string
}

export interface Link extends Extendable {
  operationRef?: string
  operationId?: string
  parameters?: Record<string, unknown> // any | Expression
  requestBody?: unknown // any | Expression
  description?: string
  server?: Server
}

export type Header = Omit<Parameter, 'name' | 'in'>

export interface Tag extends Extendable {
  name: string
  description?: CommonMark
  externalDocs?: ExternalDocumentation
}

export interface Reference {
  $ref: string
  summary: string
  description: string
}

export interface Schema extends Extendable {
  nullable?: boolean
  discriminator?: Discriminator
  readonly?: boolean
  writeOnly?: boolean
  xml?: XML
  externalDocs?: ExternalDocumentation
  example?: unknown
  deprecated?: boolean

  // 以下字段的定义取自 JSON Schema 规范，部分字段针对 OpenAPI 的情况做了调整
  // https://datatracker.ietf.org/doc/html/draft-wright-json-schema-validation-00
  multipleOf?: number // 须大于 0，要求数值是此值的倍数
  maximum?: number // 要求数值“小于等于”此值，如果 exclusiveMaximum 为 true 则是“小于”此值
  exclusiveMaximum?: boolean // 控制 maximum 的匹配方式
  minimum?: number // 要求数值“大于等于”此值，如果 exclusiveMinimum 为 true 则是“大于”此值
  exclusiveMinimum?: boolean
  maxLength?: number // 要求字符串长度小于等于此值
  minLength?: number // 要求字符串长度大于等于此值
  pattern?: string // 要求字符串匹配此正则表达式
  items?: Schema // 数组子项类型，type=array 时必须提供
  maxItems?: number // 数组最大长度
  minItems?: number // 数组最小长度
  uniqueItems?: boolean // 若为 true，要求数组各子项不重复
  maxProperties?: number // 对象值最大属性数量
  minProperties?: string // 对象值最小属性数量
  required?: [string] & string[] // 对象值中必须存在的属性
  properties?: Record<string, Schema> // 定义对象值各属性
  additionalProperties?: boolean | Schema // 定义对象值是否允许额外属性（boolean）或者定义所有额外属性的格式（Schema）
  enum?: unknown[] // 要求字段值必须是此数组中的值
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' // 指定字段类型
  allOf?: Schema[] // 要求字段值匹配数组里的所有定义
  anyOf?: Schema[] // 要求字段值匹配数组里的任意定义（也允许匹配多个定义）
  oneOf?: Schema[] // 要求字段值匹配且只匹配数组里的“一个”定义
  not?: Schema // 要求字段值匹配此定义
  title?: string // 字段标题
  description?: CommonMark // 字段描述
  default?: unknown // 默认值
  format?: string // 字段值语义格式（如 email）
}

export interface Discriminator {
  propertyName?: string
  mapping?: Record<string, string>
}

export interface XML extends Extendable {
  name?: string
  namespace?: string
  prefix?: string
  attribute?: boolean
  wrapped?: boolean
}

export interface SecurityScheme extends Extendable {
  type: string
  description?: string
  name: string
  in: string
  schema: string
  bearerFormat?: string
  flows: OAuthFlows
  openIdConnectUrl: string
}

export interface OAuthFlows extends Extendable {
  implicit?: OAuthFlow
  password?: OAuthFlow
  clientCredentials?: OAuthFlow
  authorizationCode?: OAuthFlow
}

export interface OAuthFlow extends Extendable {
  authorizationUrl: string
  tokenUrl: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export interface SecurityRequirement {
  [name: string]: string
}

// ========= 辅助类型 ==========

// 可提供扩展字段的对象
// 扩展字段的 key 需以 'x-' 开头，例如 x-token
export type Extendable = {} // eslint-disable-line @typescript-eslint/ban-types

// 支持 CommonMark 格式的富文本字符串
export type CommonMark = string

export type Expression = string

// ========= 扩展类型 =========

export interface TypedSchema<T> extends Schema {
  allOf?: TypedSchema<T>[]
  anyOf?: TypedSchema<T>[]
  oneOf?: TypedSchema<T>[]
  not?: TypedSchema<T>
  example?: T
  enum?: T[]
  default?: T
}

export interface StringSchema extends TypedSchema<string> {
  type: 'string'
}
export interface NumberSchema extends TypedSchema<number> {
  type: 'number'
}
export interface BooleanSchema extends TypedSchema<boolean> {
  type: 'boolean'
}
export interface ObjectSchema extends TypedSchema<Record<string, unknown>> {
  type: 'object'
}
export interface ArraySchema extends TypedSchema<unknown[]> {
  type: 'array'
}
