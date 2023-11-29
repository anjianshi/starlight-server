import { HTTPError, type NodeRequest } from '../types.js'
import { getBoundary, parseFormData } from './form-data.js'
import { receiveBody } from './receive.js'

export interface BodyOptions {
  /**
   * Maximum size of body, unit `M`.
   * @default 1000
   */
  limit?: number
}

/**
 * Receive And Parse Request Body
 * Support JSON And multipart/form-data
 */
export class RequestBody {
  constructor(
    readonly nodeRequest: NodeRequest,
    readonly options: BodyOptions,
  ) {}

  get contentType() {
    return this.nodeRequest.headers['content-type'] ?? ''
  }

  protected receiving?: Promise<Buffer | undefined>
  async buffer() {
    if (!this.receiving)
      this.receiving = receiveBody(this.nodeRequest, (this.options.limit ?? 1000) * 1000 * 1000)
    return this.receiving
  }

  async json() {
    if (this.contentType && !this.contentType.startsWith('application/json')) {
      throw new HTTPError(400, "JSON parse failed, invalid 'Content-Type'.")
    }

    const buffer = await this.buffer()
    if (!buffer) return undefined

    try {
      return JSON.parse(buffer.toString()) as unknown
    } catch (e) {
      throw new HTTPError(400, 'Invalid JSON.')
    }
  }

  async formData() {
    const boundary = getBoundary(this.contentType)
    if (boundary === null)
      throw new HTTPError(400, "form-data parse failed, invalid 'Content-Type'.")

    const buffer = await this.buffer()
    if (!buffer) return undefined

    return parseFormData(buffer, boundary)
  }
}
