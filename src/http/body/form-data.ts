/**
 * Parsing multipart/form-data
 *
 * Referenced this library：https://github.com/nachomazzara/parse-multipart-data
 * (This library has bugs, so I decided to implement it myself.）
 *
 * Introduce for multipart/form-data format：https://www.jianshu.com/p/29e38bcc8a1d
 */
import { HTTPError } from '../types.js'

/**
 * 解析后的 FormData（格式参考浏览器环境中的 FormData 对象）
 * Parsed FormData (formatted like the FormData object in a browser environment)
 */
export interface TextInput {
  type: 'text'
  name: string
  data: string
}
export interface FileInput {
  type: 'file'
  name: string
  filename: string
  mimeType: string
  data: Buffer
}
export type Input = TextInput | FileInput

export class FormData {
  constructor(readonly inputs: Input[]) {}

  get(name: string) {
    return this.inputs.find(v => v.name === name)
  }
  getAll(name: string) {
    return this.inputs.filter(v => v.name === name)
  }
  getText(name: string) {
    return this.inputs.find((v): v is TextInput => v.name === name && v.type === 'text')?.data
  }
  getFile(name: string) {
    return this.inputs.find((v): v is FileInput => v.name === name && v.type === 'file')
  }
  has(name: string) {
    return !!this.get(name)
  }
  hasText(name: string) {
    return this.getText(name) !== undefined
  }
  hasFile(name: string) {
    return !!this.getFile(name)
  }
}

/**
 * 从 Content-Type Header 中解析出 form-data boundary
 * Parse form-data boundary from Content-Type header.
 */
export function getBoundary(contentType: string) {
  const prefix = 'multipart/form-data; boundary='
  return contentType.startsWith(prefix) ? contentType.slice(prefix.length) : null
}

/**
 * parse form-data
 */
enum State {
  Init = 0,
  ReadingHeaders = 1,
  ReadingData = 2,
}

export function parseFormData(body: Buffer, boundary: string): FormData {
  const inputs: Input[] = []

  let rest = body
  let state: State = State.Init
  let partialInput: Input | undefined // 在 ReadingHeaders 状态里会为其赋值 Will be assigned when in the ReadingHeaders state
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!rest.byteLength) throw new HTTPError(400, 'form-data: not complete')

    if (state === State.Init) {
      const sep = `--${boundary}\r\n`
      if (!startsWith(rest, sep)) throw new HTTPError(400, 'form-data: part separator invalid')
      rest = rest.subarray(byteLength(sep))
      state = State.ReadingHeaders
    } else if (state === State.ReadingHeaders) {
      if (!startsWith(rest, 'Content-Disposition: form-data;', true))
        throw new HTTPError(400, 'form-data: headers or format invalid')
      const headerEnds = Buffer.from('\r\n\r\n')
      const headerMax = 10000 // header 部分最多允许这么多字节 Max allowd bytes of header
      const headersEndIndex = rest.subarray(0, headerMax).indexOf(headerEnds)
      if (headersEndIndex === -1) throw new HTTPError(400, 'form-data: headers invalid or too long')

      const headers = rest
        .subarray(0, headersEndIndex)
        .toString()
        .split('\r\n')
        .map(item => {
          const sepIndex = item.indexOf(':')
          return sepIndex !== -1
            ? { name: item.slice(0, sepIndex).trim(), value: item.slice(sepIndex + 2).trim() }
            : null
        })
        .filter((v): v is { name: string; value: string } => !!v)

      const disposition =
        headers.find(v => v.name.toLowerCase() === 'Content-Disposition'.toLowerCase())?.value ?? ''
      const name = /(?:;| )name="(.*?)"(?:;|$)/.exec(disposition)?.[1] ?? ''
      const filename = /(?:;| )filename="(.*?)"(?:;|$)/.exec(disposition)?.[1]
      const contentType = headers.find(
        v => v.name.toLowerCase() === 'Content-Type'.toLowerCase()
      )?.value
      partialInput =
        filename === undefined
          ? { type: 'text', name, data: '' }
          : { type: 'file', name, filename, mimeType: contentType ?? '', data: Buffer.from('') }

      rest = rest.subarray(headersEndIndex + headerEnds.byteLength)
      state = State.ReadingData
    } else {
      const dataEnds = Buffer.from(`\r\n--${boundary}`)
      const dataEndIndex = rest.indexOf(dataEnds)
      if (dataEndIndex === -1) throw new HTTPError(400, 'form-data: data no ends')
      const data = rest.subarray(0, dataEndIndex)
      const input = partialInput!
      if (input.type === 'text') input.data = data.toString()
      else input.data = data
      inputs.push(input)

      const afterData = rest.subarray(dataEndIndex + dataEnds.byteLength)
      if (equals(afterData, '--') || equals(afterData, '--\r\n')) {
        // 全部解析结束 Parse whole finished
        break
      } else if (startsWith(afterData, '\r\n')) {
        // 开始解析下一部分 Parsing next part
        rest = rest.subarray(dataEndIndex + byteLength('\r\n'))
        state = State.Init
      } else {
        throw new HTTPError(400, 'form-data: invalid data ends')
      }
    }
  }

  return new FormData(inputs)
}

function byteLength(string: string) {
  return Buffer.byteLength(string)
}

function startsWith(buffer: Buffer, string: string, caseInsensitive = false) {
  const sliced = buffer.subarray(0, byteLength(string)).toString()
  return caseInsensitive ? sliced.toLowerCase() === string.toLowerCase() : sliced === string
}

function equals(buffer: Buffer, string: string) {
  return (
    // 先进行长度比较，以避免 buffer 太大时进行 toString() 影响性能
    // Perform a length comparison first to avoid the performance impact of toString() when the buffer is too large.
    buffer.byteLength === byteLength(string) && buffer.toString() === string
  )
}
