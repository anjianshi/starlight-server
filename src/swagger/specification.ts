/**
 * OpenAPI Specification
 * https://swagger.io/specification/
 *
 * ---------------------
 *
 * # 概念解释
 *
 * Operation
 *   即通常说的“接口”。
 *   OpenAPI 遵循 RESTFul 的思路，一个路径代表一项资源，每个 HTTP Method 代表对此资源的一项操作（Operation）。
 *
 * Tag
 *   接口标签，可以理解为是接口分组。
 *   一个接口可以有多个标签，即接口能归属多个分组。
 *
 * Security Scheme
 *   认证方案。基于 OAuth 等标准制定的具体执行方案。
 *
 * Security Requirement
 *   认证要求。
 *   要求发起请求时必须实现一种或多种“认证方案”。
 *   一个接口可以有多套“认证要求”，请求方选择其中一种来实现。
 *   （注意是选择一种“要求”，而不是选择“要求”里的一种“方案”）。
 *
 * Link
 *   接口关联。
 *   接口之间可能有关联关系，例如 `/schools/:id` 和 `/schools/:schoolId/classes/:id` 就是相关的接口，
 *   并且前者的 `id` 参数对应后者的 `schoolId` 参数。
 *   “接口关联”就是用来记录下这些关系。
 *
 * Webhook
 *   由“接口提供方”主动请求“接口使用者”的网址，例如在某些事件发生时通知使用者。
 *
 * Callback
 *   接口回调：某个接口被调用后，反过来请求“请求发起者”的网址。
 *   例如像微信授权流程：“使用者”请求授权接口 - “微信”反过来请求“使用者”的网址来传递授权结果
 *   注意：Callback 和 Webhook 很像，不过一个是“调用接口后”反过来被请求；另一个是跟接口调用无关，单纯被“接口提供方”调用。
 *
 * Data Type
 *   数据类型（string、number、boolean、array、object...）。
 *
 * Schema
 *   数据规范：定义一种数据的“数据格式”和“验证规则”。
 *   - “数据格式”包含数据类型（Data Type）信息，对于 object，也包含对象接口信息。
 *     它决定了数据以什么形态存在，例如在内存中怎么存储。
 *   - 验证规则则是像“字符串长度在 8 ~ 16 之间”等“业务”上的要求，它与数据的存在方式无关，但决定了数据是否符合业务需求。
 *
 * Media Type
 *   以特定 MIME Type 传递的内容的 Schema 和范例。
 *   固定以 { [MIMEType]: MediaType } 的形式出现。
 *
 * ---------------------
 *
 * # 字符串扩展
 *
 * CommonMark
 *   支持 CommonMark 格式的富文本字符串
 *
 * MIME Type
 *   表示 MIME Type 的字符串，如：application/json。
 *   凡是可指定 MIME Type 字符串的地方，都支持通配符 `image/*`，并可用逗号分隔多项 `image/jpg,image/png`。
 *
 * Runtime Expression
 *   可通过此表达式结合请求信息计算出一个 URL。
 *   详见 <https://swagger.io/specification/#runtime-expressions>
 *
 * ---------------------
 *
 * # 请求参数序列化（Parameter Style）
 *
 * 发起请求时要携带参数，如果业务上要求参数值不是纯文本（如数组、对象），那么需要经过格式化才能传递。
 *
 * 例如一个接口批量返回若干本书的详情：`GET /books`，并通过 `id_list` 参数指定一系列书的 ID。
 * 这个 id_list 应该是一个数组 `[1,2,3]`，但 HTTP 请求只能传递纯文本，需要把数组 `序列化` 成纯文本来传递。
 * 最常见的办法，是把 `id_list` 放在 query 里，多个 ID 用逗号分隔：`/books?id_list=1,2,3`，这种序列化方式在 OpenAPI 规范里被称为 `form`。
 * 还有一种办法是直接加在 path 里：`/books/1,2,3`，这种方式被称为 `simple`。
 * 以上都是使用 OpenAPI 规范里预设的序列化方式（Parameter Style）来序列化参数，这被称为是 `简单场景的参数`。
 *
 * 另外，还可以由服务器端和客户端约定，用某种 MIME Type（如 application/json）的格式序列化参数：`/books/?id_list=[1,2,3]`。
 * 这被称为 `复杂场景的参数`（即“预设方案满足不了需求场景”的参数）。
 *
 * ## 预设序列化方式（Parameter Style）列表
 *
 * ----------------------------------------------------------
 * 序列化方式     | 支持数据类型           | 支持的参数位置
 * ----------------------------------------------------------
 * matrix         | primitive,array,object | path
 * label          | primitive,array,object | path
 * form           | primitive,array,object | query,cookie
 * simple         | primitive,array        | path,header
 * spaceDelimited | array,object           | query
 * pipeDelimited  | array,object           | query
 * deepObject     | object                 | query
 *
 * ## 各参数位置默认的序列化方式
 *
 * - path: simple
 * - query: form
 * - header: simple
 * - cookie: form
 *
 * ## 参数值范例
 *
 * 假设有一个名为 `color` 的参数，有以下几种值之一：
 * ```
 * string -> "blue"
 * array -> ["blue", "black", "brown"]
 * object -> { "R": 100, "G": 200, "B": 150 }
 * ```
 *
 * -----------------------------------------------------------------------------------------------------------------------------------
 * 序列化方式     | 拆分传递 | 空值     | string      | array                               | object
 * -----------------------------------------------------------------------------------------------------------------------------------
 * matrix         | 否       | ;color   | ;color=blue | ;color=blue;black;brown             | ;color=R,100,G,200,B,150
 * matrix         | 是       | ;color   | ;color=blue | ;color=blue;color=black;color=brown | ;R=100;G=200;B=150
 * label          | 否       | .        | .blue       | .blue.black.brown                   | .R.100.G.200.B.150
 * label          | 是       | .        | .blue       | .blue.black.brown                   | .R=100.G=200.B=150
 * form           | 否       | color=   | color=blue  | color=blue,black,brown              | color=R,100,G,200,B,150
 * form           | 是       | color=   | color=blue  | color=blue&color=black&color=brown  | R=100&G=200&B=150
 * simple         | 否       | 不支持   | blue        | blue,black,brown                    | R,100,G,200,B,150
 * simple         | 是       | 不支持   | blue        | blue,black,brown                    | R=100,G=200,B=150
 * spaceDelimited | 否       | 不支持   | 不支持      |	blue%20black%20brown                | R%20100%20G%20200%20B%20150
 * pipeDelimited  | 否       | 不支持   | 不支持      |	blue|black|brown                    | R|100|G|200|B|150
 * deepObject     | 是       | 不支持   | 不支持      |	不支持                              | color[R]=100&color[G]=200&color[B]=150
 *
 * 注：拆分传递就是值有多项（即值是 array 或 object）时，每项分别传递：`a=1&a=2&a=3`；
 *     反之则是一次性传递：`a=1,2,3`
 */

export interface OpenAPI {
  /** OpenAPI 规范版本  */
  openapi: '3.1.0'
  /** 对此接口文档的介绍  */
  info: Info
  /**
   * 指定 Schema 定义中 $schema 的默认值，必须是合法的 URI
   * 对 $schema 的介绍详见：<https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.1.1>
   */
  jsonSchemaDialect?: string
  /** 服务器网址列表  */
  servers?: Server[]
  /** [核心] 接口路径列表 */
  paths: Paths
  /**
   * 定义“接口提供方”可能主动请求“接口使用者”的情况，例如做某些通知。
   * “接口使用者”可根据需要有选择性地实现这些 webhook 来接收通知。
   */
  webhooks?: { [name: string]: PathItem | Reference }
  /** [核心] 定义可重用内容（可通过 $ref 引用这里的内容） */
  components?: Components
  /**
   * 此文档内接口的认证要求列表，调用接口时选择其中一种来完成认证。
   * 部分接口可能单独定义自己的认证要求。
   */
  security?: SecurityRequirement[]
  /** 定义各接口标签的具体信息（定义接口时只指定了标签名，这里可以进一步描述标签） */
  tags?: Tag[]
  /** 外部文档 */
  externalDocs?: ExternalDocumentation
}

/** 对此接口文档的介绍  */
export interface Info extends Extensions {
  /** 文档标题 */
  title: string
  /** 文档内容概述 */
  summary?: string
  /** 详细介绍（CommonMark） */
  description?: string
  /** TOS  */
  termsOfService?: string
  /** 联系人 */
  contact?: Contact
  /** 版权信息  */
  license?: License
  /** 接口文档的版本（注意不是 OpenAPI 规范的版本） */
  version: string
}

/** 接口文档的联系人信息  */
export interface Contact extends Extensions {
  name?: string
  url?: string
  email?: string
}

/** 接口文档版权信息  */
export interface License extends Extensions {
  name: string
  url?: string
}

/** 服务器定义  */
export interface Server extends Extensions {
  /** 服务器网址 */
  url: string
  /** 服务器介绍（CommonMark） */
  description?: string
  /** 定义可插入到 URL 中的变量列表 */
  variables?: { [variableName: string]: ServerVariable }
}

/** 服务器 URL 变量定义  */
export interface ServerVariable extends Extensions {
  /** 变量的可选值，不指定则变量可以是任意值。不允许为空数组（不然就变成所有值都不允许了） */
  enum?: string[]
  /** 变量的默认值 */
  default: string
  /** 详细介绍（CommonMark） */
  description: string
}

/** 可重用内容集合 */
export interface Components extends Extensions {
  /** 数据格式（可用在请求和响应内容中） */
  schemas?: { [name: string]: Schema }
  /** 响应内容 */
  responses?: { [name: string]: Response | Reference }
  /** 请求参数 */
  parameters?: { [name: string]: Parameter | Reference }
  /** 范例 */
  examples?: { [name: string]: Example | Reference }
  /** 请求体 */
  requestBodies?: { [name: string]: RequestBody | Reference }
  /** HTTP Header 定义 */
  headers?: { [name: string]: Header | Reference }
  /** 认证方案 */
  securitySchemes?: { [name: string]: SecurityScheme | Reference }
  /** 接口关联信息 */
  links?: { [name: string]: Link | Reference }
  /** 接口回调（接口被调用后，反过来请求“请求发起者”的网址） */
  callbacks?: { [name: string]: Callback | Reference }
  /** 对某一接口路径的定义 */
  pathItems?: { [name: string]: PathItem | Reference }
}

/**
 * 接口路径列表
 * path 须以 '/' 开头，支持路径参数 `/pets/{petId}`
 */
export interface Paths extends LooseExtensions {
  [path: string]: PathItem
}

/** 对某一资源路径的定义（接口都定义在资源路径下） */
export type PathItem = PathItemContent | Reference
export interface PathItemContent extends Extensions {
  /** 概述，对路径下所有接口生效 */
  summary?: string
  /** 详细描述，对路径下所有接口生效（CommonMark） */
  description?: string

  // 定义路径下各 HTTP Method 的接口
  get?: Operation
  put?: Operation
  post?: Operation
  delete?: Operation
  options?: Operation
  head?: Operation
  patch?: Operation
  trace?: Operation

  /** 服务器列表（覆盖全局的 servers 定义） */
  servers?: Server[]
  /** 路径下接口公共的参数（各接口可覆盖此定义） */
  parameters?: (Parameter | Reference)[]
}

export type LowerMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'
export type Method = LowerMethod | Uppercase<LowerMethod>

/** 接口定义 */
export interface Operation {
  /** 接口分组 */
  tags?: string[]
  /** 接口概述 */
  summary?: string
  /** 详细介绍（CommonMark） */
  description?: string
  /** 外部文档 */
  externalDocs?: ExternalDocumentation
  /**
   * 接口 ID，需全局唯一。
   * 可被 Link 定义引用，也可能在其他地方作为接口的唯一标识被使用
   */
  operationId?: string
  /** 请求参数列表 */
  parameters?: (Parameter | Reference)[]
  /** 请求体 */
  requestBody?: RequestBody | Reference
  /** 响应内容 */
  responses?: Responses
  /** 此接口的回调列表。回调 id 须全局唯一。 */
  callbacks?: { [id: string]: Callback | Reference }
  /** 接口是否已废弃 */
  deprecated?: boolean
  /** 此接口的安全要求，代替全局定义的安全要求 */
  security?: SecurityRequirement[]
  /** 可访问此接口的服务器网址列表，代替全局定义的列表  */
  servers?: Server[]
}

/** 外部文档定义 */
export interface ExternalDocumentation {
  /** 文档介绍（CommonMark） */
  description?: string
  /** 文档网址 */
  url: string
}

/** 请求参数 */
export type Parameter = StandardParameter | CustomizeParameter
/** 请求参数基本字段 */
export interface BaseParameter extends Extensions {
  /** 参数名 */
  name: string
  /** 参数位置 */
  in: ParameterLocation
  /** 详细描述（CommonMark） */
  description?: string
  /** 是否必须，in=path 时必须为 true，其他情况默认为 false */
  required?: boolean
  /** 是否已废弃 */
  deprecated?: boolean
  /**
   * 是否允许传空值，仅 in=query 时有效，默认为 false。
   * 此属性不建议使用，以后可能会被移除。
   */
  allowEmptyValue?: boolean
}
/**
 * 简单场景的参数：采用预设的参数序列化方式。
 * style 指定序列化方式、schema 定义数据内容。
 * */
export interface StandardParameter extends BaseParameter {
  /**
   * 参数序列化方式。
   * 通常使用默认值即可：path => simple, query => form, header => simple, cookie => form。
   * 详见顶部对“参数序列化”的说明。
   */
  style?: ParameterStyle
  /**
   * 参数值是 array 或 object 时，是否应拆分传递。
   * style=form 时默认为 true，其他情况默认为 false。
   */
  explode?: boolean
  /**
   * 是否允许出现没被转义的保留字符（:/?#[]@!$&'()*+,;=）。
   * 仅 in=query 时有效，默认为 false。
   */
  allowReserved?: boolean
  /** 数据规范 */
  schema?: Schema | Reference
  /** 范例值，不能与 examples 同时存在 */
  example?: unknown
  /** 一系列范例值，不能与 example 同时存在 */
  examples?: { [exampleName: string]: Example | Reference }
}
/**
 * 复杂场景的参数：用指定 MIME Type 的格式序列化参数。
 * 例如可以指定 query 中的一个值是 JSON 字符串：
 * {
 *   name: 'book',
 *   in: 'query',
 *   content: {
 *     'application/json': {
 *       schema: {...},
 *       example: '{"name": "史记","author":"司马迁"}'
 *     }
 *   }
 * }
 * 然后就可以这样发起请求：
 * GET /book/buy?people=1&book={"name": "史记","author":"司马迁"}
 */
export interface CustomizeParameter extends BaseParameter {
  /**
   * 定义序列化方式（MIME Type）和数据内容。
   * 此对象中只能有一个键值对，即一个参数只能有一种序列化方式。
   */
  content?: { [MIMEType: string]: MediaType }
}

/** 参数位置 */
export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie'

/** 预设的参数序列化方式（详见顶部说明） */
export type ParameterStyle =
  | 'matrix'
  | 'label'
  | 'form'
  | 'simple'
  | 'spaceDelimited'
  | 'pipeDelimited'
  | 'deepObject'

/** 请求体 */
export interface RequestBody extends Extensions {
  /** 详细介绍（CommonMark） */
  description?: string
  /**
   * 不同 MIME Type 下的内容格式。
   * 例如一个接口支持接收 JSON 或 HTML 表单形式的 body。
   * 那么就要定义这样的 content：{ 'application/json': xxx, 'application/x-www-form-urlencoded': xxx }
   */
  content: { [MIMEType: string]: MediaType }
  /** 请求体是否必须 */
  required?: boolean
}

/** 以特定 MIME Type 传递的内容的 Schema 和范例 */
export interface MediaType extends Extensions {
  /** 数据规范 */
  schema?: Schema
  /** 范例值，不能与 examples 同时存在 */
  example?: unknown
  /** 一系列范例值，不能与 example 同时存在 */
  examples?: { [exampleName: string]: Example | Reference }
  /**
   * 为 schema 中的各对象字段补充编码信息。
   * - 仅在 MediaType 出现在 RequestBody 中，且 MIME type 为 `multipart/*` 或 `application/x-www-form-urlencoded` 时有意义。
   * - 在这种情况下，根据 HTTP 协议，body 内容明确地由一个个参数构成，每个参数可以有自己的序列化方式，
   *   且和 Parameter 类似，支持使用预设的序列化方式或自定 MIME Type 来序列化。
   * - 可以理解为 body 的 MIME type 是这两种时，可以通过 encoding 字段在 body 中定义 Parameter。
   *   而其他情况下，body 只能整体定义，总体只拥有一种 MIME Type，不能给其下每个字段单独定义序列化方式。
   */
  encoding?: { [schemaProperty: string]: Encoding }
}

/**
 * 定义 RequestBody 中单个字段值的编码信息。
 * 详见 MediaType['encoding] 中的说明。
 */
export type Encoding = StandardEncoding | CustomizeEncoding
/**
 * 采用预定序列化方式的 encoding 信息（类似 StandardParameter）。
 * 仅在 RequestBody 的 MIME Type 为 `multipart/form-data` 或 `application/x-www-form-urlencoded` 时有效（就是说不支持 `multipart/*` 的其他形式）。
 */
export interface StandardEncoding {
  /**
   * 定义通过 HTTP Header 为此字段提供的额外信息，如 `Content-Disposition`。
   * 仅当 MediaType 的 MIME Type 是 `multipart/*` 时有效。
   * （`Content-Type` 值已通过 MediaType 的 key 指定，无需再定义在这里）
   */
  headers?: Record<string, Header | Reference>
  /**
   * 指定此字段的序列化方式。
   * body 里不像 Parameter 有 `in` 的概念，不过所有规则与 `in=query` 的参数相同，包括默认值。
   */
  style?: ParameterStyle
  /**
   * 字段值是 array 或 object 时是否要拆分开传递。
   * style=form 时默认为 true，其他情况默认为 false。
   */
  explode?: boolean
  /** 是否允许出现没被转义的保留字符（:/?#[]@!$&'()*+,;=），默认为 false */
  allowReserved?: boolean
}
/**
 * 用指定 MIME Type 的格式序列化的 encoding 信息（类似 CustomizeParameter）
 */
export interface CustomizeEncoding {
  /**
   * 指定 body 中的目标字段使用哪种 MIME Type 来序列化。
   * 默认值根据此字段的数据类型决定：
   * - object -> application/json
   * - array -> 根据数组元素的类型决定
   * - 其他 -> application/octet-stream
   */
  contentType: string
  headers: StandardEncoding['headers']
}

/**
 * 定义接口可能返回的 HTTP Status 及对应的响应内容。
 * - 必须定义至少一种 status，且只有一种 status 时，必须代表接口成功时的响应。
 * - `default` 用来定义 `明确定义了的 status` 之外的情况（就是说不能只有 default，应该至少另有一种代表成功的 status 定义）。
 * - status 支持通配符：1xx 2xx 3xx 4xx 5xx；不过精确指定的 status（如 404）优先级高于通配符。
 */
export interface Responses extends LooseExtensions {
  default?: Response | Reference
  [HTTPStatus: string]: Response | Reference | undefined
}

/** 定义接口响应 */
export interface Response extends Extensions {
  /** 详细描述（CommonMark） */
  description?: string
  /**
   * 响应 headers。
   * 注意：`Content-Type` 通过 `content` 指定，不在这里定义。
   */
  headers?: Record<string, Header | Reference>
  /**
   * 定义可能的响应内容 MIME Type，及对应的内容格式。
   * 例如一个接口支持返回 JSON 内容，也支持返回 XML（请求时可通过 `Accept` Header 或其他方式指定）。
   */
  content?: { [MIMEType: string]: MediaType }
  /** 列出与此响应内容关联的其他接口（例如返回内容里的 id 字段是另一个接口需要的传参） */
  links?: { [linkName: string]: Link | Reference }
}

/**
 * 定义接口回调（接口被调用后，反过来请求“请求发起者”的网址）。
 * 通过 `expression` 计算出要调用的网址。
 */
export interface Callback extends LooseExtensions {
  [expression: string]: PathItem
}

/** 定义范例值 */
export interface Example extends Extensions {
  /** 概述 */
  summary?: string
  /** 详细描述（CommonMark） */
  description?: string
  /** 范例值内容。不能和 externalValue 同时使用 */
  value?: unknown
  /** 定义了范例值的网址。不能和 value 同时使用 */
  externalValue?: string
}

/** 定义“接口关联” */
export interface Link extends Extensions {
  /**
   * 指向目标接口（Operation）的绝对或相对路径（URI）。
   * 对“相对路径”的计算方式见：<https://swagger.io/specification/#relative-references-in-uris>。
   * 此字段不能与 operationId 一起使用。
   */
  operationRef?: string
  /**
   * 目标接口的 operationId。
   * 不能与 operationRef 一起使用。
   */
  operationId?: string
  /**
   * 当前接口中可作为关联接口的参数的内容。
   * - name: 在关联接口处的参数名。可通过 `path.id` 这样的形式指定参数位置（in）
   * - value: 根据当前接口信息生成的参数值。可以是“常量”或“可计算的表达式（Runtime Expression）”
   */
  parameters?: { [name: string]: unknown }
  /**
   * 当前接口中可作为关联接口的 requestBody 的内容。
   * 值可以是“常量”或“可计算的表达式（Runtime Expression）”。
   */
  requestBody?: unknown // any | Expression
  /** 对接口关系的详细描述（CommonMark） */
  description?: string
  /** 供关联接口使用的服务器信息 */
  server?: Server
}

/**
 * 定义 Header 值的格式
 * 形式和 Parameter 相同，不过不能指定 name 和 in（name 通过 headers[name] 指定；in 固定是 'header）
 */
export type Header = Omit<Parameter, 'name' | 'in'>

/**
 * 定义接口标签（接口分组）的具体信息
 */
export interface Tag extends Extensions {
  /** 标签（分组）名 */
  name: string
  /** 详细描述（CommonMark） */
  description?: string
  /** 相关外部文档 */
  externalDocs?: ExternalDocumentation
}

/**
 * 引用
 * 引用当前文档或外部 OpenAPI 文档中的某段定义。
 */
export interface Reference {
  /** 引用对象的 URI */
  $ref: string
  /**
   * 对引用对象的概述，会覆盖引用对象对自己的概述。
   * 如果引用对象本身不支持设置概述，则此字段无效。
   */
  summary?: string
  /**
   * 对引用对象的详细介绍（CommonMark），会覆盖引用对象自己的详细介绍。
   * 如果引用独享不支持设置详细介绍，则此字段无效。
   */
  description?: string
}

/**
 * 定义“数据规范”。
 *
 * 由三部分组成：
 * - 数据格式，包括数据类型（Data Type）和对象字段结构等信息。
 * - 验证规则，如字符串长度要小于 16。
 * - 辅助说明，如 externalDocs 等字段。
 *
 * 定义内容继承自 JSON Schema 规范，部分字段针对 OpenAPI 的情况做了调整。
 * 数据格式 - JSON Schema Core 规范：<https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00>
 * 验证规则 - JSON Schema Validation 规范：<https://datatracker.ietf.org/doc/html/draft-wright-json-schema-validation-00>
 */
export interface Schema extends Extensions {
  /**
   * 指定“多态鉴别”信息
   * 即快速判断把 allOf / anyOf / oneOf 指定的多个 schema 中的哪个作为当前要使用的 schema。
   * 详见：<https://swagger.io/specification/#composition-and-inheritance-polymorphism>
   */
  discriminator?: Discriminator
  /**
   * 仅在“子 Schema”中有效，在“根 Schema”中无意义，
   * 用来给“子 Schema”对应的字段指定额外的 XML 表现形式信息。
   */
  xml?: XML
  /** 此 Schema 的外部文档 */
  externalDocs?: ExternalDocumentation
  /** 内容范例（此字段已废弃） */
  example?: unknown

  // ----- JSON Schema Core 规范内容 -----

  /**
   * 指定当前定义遵循的 JSON Schema 变种（dialect）
   * 详见：<https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.1.1>
   */
  $schema?: string

  /** 要求数据符合数组里的“所有”规范 */
  allOf?: (Schema | Reference)[]
  /** 要求数据符合数组里的“一个或多个”规范 */
  anyOf?: (Schema | Reference)[]
  /** 要求数据符合且只符合数组里的“一个”规范 */
  oneOf?: (Schema | Reference)[]
  /** 要求数据必须“不符合”此规范  */
  not?: Schema | Reference

  /** 如果数据符合 `if` 定义的规范，则要求其也符合 `then` 定义的规范，否则要求其符合 `else` 定义的规范 */
  if?: Schema | Reference
  /** 数据符合 `if` 定义的规范时，也要符合此规范 */
  then?: Schema | Reference
  /** 数据不符合 `if` 定义的规范时，则要符合此规范 */
  else?: Schema | Reference

  /** [type=array] 数组前几个元素的规范（其余元素根据 items 的定义来验证） */
  prefixItems?: (Schema | Reference)[]
  /** [type=array] prefixItems 之外每个元素的规范 */
  items?: Schema | Reference
  /** [type=array] 要求数组里至少有一个元素符合此规范 */
  contains?: Schema | Reference

  /** [type=object] 对象各字段的规范  */
  properties?: { [name: string]: Schema | Reference }
  /** [type=object] 要求名称与某个 regexp 匹配的字段，值也必须符合对应的 Schema 规范 */
  patternProperties?: { [regexp: string]: Schema | Reference }
  /** [type=object] 指定没被 properties 和 patternProperties 匹配到的字段的规范。 */
  additionalProperties?: Schema | Reference
  /** [type=object] 要求对象的每个字段名作为字符串都符合此规范 */
  propertyNames?: Schema | Reference

  // ----- JSON Schema Validation 规范内容 -----

  /** [type=number] 大于 0 且是此值的倍数 */
  multipleOf?: number
  /** [type=number] “小于等于”此值，如果 exclusiveMaximum 为 true 则是“小于”此值 */
  maximum?: number
  /** [type=number] 控制 maximum 的匹配方式 @defaults false */
  exclusiveMaximum?: boolean
  /** [type=number] “大于等于”此值，如果 exclusiveMinimum 为 true 则是“大于”此值 */
  minimum?: number
  /** [type=number] 控制 minimum 的匹配方式 @defaults false */
  exclusiveMinimum?: boolean

  /** [type=string] 字符串最大长度 */
  maxLength?: number
  /** [type=string] 字符串最小长度 */
  minLength?: number
  /** [type=string] 字符串匹配此正则表达式 */
  pattern?: string

  /** [type=array] 数组最大长度 */
  maxItems?: number
  /** [type=array] 数组最小长度 */
  minItems?: number
  /** [type=array] 要求数组里没有重复值 @defaults false */
  uniqueItems?: boolean

  /** [type=object] 对象最大字段数 */
  maxProperties?: number
  /** [type=object] 对象最大字段数 */
  minProperties?: string
  /** [type=object] 对象必须有的字段 */
  required?: string[]

  /** 要求数据只能是这里出现了的值  */
  enum?: unknown[]
  /** 指定数据类型  */
  type?: DataType | DataType[]

  /** 数据标题 */
  title?: string
  /** 数据详细描述（CommonMark） */
  description?: string
  /** 默认值 */
  default?: unknown
  /** 字段值语义格式（如 email） */
  format?: string

  // ----- JSON Schema Core 规范里的不常用字段 -----

  $vocabulary?: string
  $id?: string
  $anchor?: string
  $dynamicAnchor?: string
  // $ref?: string // 类型里不能定义此字段，不然无法区分 Schema 和 Reference
  $dynamicRef?: string
  $defs?: { [id: string]: Schema }
  $comment?: string
  dependentSchemas?: { [propertyName: string]: Schema | Reference }
  unevaluatedItems?: Schema
  unevaluatedProperties?: Schema

  // ----- JSON Schema Validation 规范里的不常用字段 -----

  dependencies?: { [name: string]: Schema | Schema[] | Reference | Reference[] }
}

/** 数据类型 */
export type DataType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null'

/**
 * “多态鉴别”信息
 * 即快速判断把 allOf / anyOf / oneOf 指定的多个 schema 中的哪个作为当前要使用的 schema。
 * 详见：<https://swagger.io/specification/#composition-and-inheritance-polymorphism>
 */
export interface Discriminator {
  /** 基于哪个对象字段进行鉴别 */
  propertyName?: string
  /** 字段值与 Schema name / Reference 的映射关系 */
  mapping?: Record<string, string>
}

/**
 * 用来提供额外的 XML 表现形式信息。
 * 详见：<https://swagger.io/specification/#xml-object>
 */
export interface XML extends Extensions {
  name?: string
  namespace?: string
  prefix?: string
  attribute?: boolean
  wrapped?: boolean
}

/**
 * 定义一种认证方案：基于 OAuth 等标准制定的具体执行方案
 */
export interface SecurityScheme extends Extensions {
  /** 方案类型（即此方案基于哪种标准） */
  type: SecuritySchemeType
  /** 详细描述（CommonMark） */
  description?: string

  /** [type=apiKey] 使用到的 header / query / cookie 参数名 */
  name: string
  /** [type=apiKey] 使用来自哪里的参数 */
  in: 'query' | 'header' | 'cookie'

  /** [type=http] 基于哪种 HTTP Authorization scheme */
  schema: string
  /** [type=http-bearer] 告知客户端 bearer token 的格式化方式 */
  bearerFormat?: string

  /** [type=oauth2] 定义支持的 OAuth flow */
  flows: OAuthFlows

  /** [type=openIdConnect] 用于获取 OAuth2 配置值的 OpenId Connect URL */
  openIdConnectUrl: string
}

/** 认证方案类型 */
export type SecuritySchemeType = 'apiKey' | 'http' | 'mutualTLS' | 'oauth2' | 'openIdConnect'

/** 定义各类支持的 OAuth Flows */
export interface OAuthFlows extends Extensions {
  implicit?: OAuthFlow
  password?: OAuthFlow
  clientCredentials?: OAuthFlow
  authorizationCode?: OAuthFlow
}

/**
 * OAuth Flow 详细配置
 * 详见：https://swagger.io/specification/#oauth-flow-object
 */
export interface OAuthFlow extends Extensions {
  authorizationUrl: string
  tokenUrl: string
  refreshUrl?: string
  scopes: Record<string, string>
}

/**
 * 定义认证要求
 * name 必须是 components.securitySchemes 中定义了的认证方案。
 * value 是方案的配置参数
 */
export interface SecurityRequirement {
  [name: string]: string
}

// ========= 辅助类型 ==========

/**
 * 在规范定义之外，补充额外内容
 * 扩展的 key 需以 'x-' 开头，例如 x-token
 */
export interface Extensions {
  [key: `x-${string}`]: unknown
}
/**
 * 因 TypeScript 限制，部分类型无法继承 Extensions，此时可改为继承此类型
 * 但还是应遵守和 Extensions 一样的规范
 */
export interface LooseExtensions {}
