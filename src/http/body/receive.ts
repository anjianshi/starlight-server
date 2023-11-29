import { type NodeRequest, HTTPError } from '../types.js'

export async function receiveBody(
  nodeRequest: NodeRequest,

  /**
   * Maximum size of body, unit `byte`
   */
  limit: number,
) {
  return new Promise<Buffer | undefined>(callback.bind(null, nodeRequest, limit))
}

function callback(
  nodeRequest: NodeRequest,
  limit: number,
  resolve: (result: Buffer | undefined) => void,
  reject: (error: HTTPError) => void,
) {
  // 若客户端提供了 Content-Length，确认其小于限额（若不符合要求，直接跳过接收）
  // If the client provides a Content-Length header, confirm that it is less than the maximum allowed size (if not, skip receiving it).
  let contentLength: number | undefined
  if ('content-length' in nodeRequest.headers) {
    contentLength = parseInt(nodeRequest.headers['content-length'] ?? '', 10)
    if (!isFinite(contentLength)) return void reject(new HTTPError(400, 'Invalid Content-Length'))
    if (contentLength > limit) return void reject(new HTTPError(413))
  }

  const parts: Buffer[] = []
  let recvLength = 0
  const handleData = (part: Buffer) => {
    parts.push(part)
    recvLength += part.byteLength

    if (recvLength > limit) {
      nodeRequest.off('data', handleData)
      nodeRequest.off('end', handleEnd)
      reject(new HTTPError(413))
    }
  }
  const handleEnd = () => {
    if (contentLength !== undefined && recvLength !== contentLength)
      reject(new HTTPError(400, 'Content-Length mismatch.'))
    else resolve(parts.length ? Buffer.concat(parts) : undefined)
  }

  nodeRequest.on('data', handleData)
  nodeRequest.on('end', handleEnd)
}
