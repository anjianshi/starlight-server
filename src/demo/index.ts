import path from 'node:path'
import { getFileDir } from '@anjianshi/utils/env-node/index.js'
import { getLogger, startHTTPServer, DefaultRouter } from '@/index.js'
import { registerSwaggerRoute } from '@/swagger/index.js'

const logger = getLogger({
  level: 'debug',
  debugLib: '*',
  file: {
    dir: path.resolve(getFileDir(import.meta), '../../logs'),
  },
})

const router = new DefaultRouter()

router.registerResponseReference('hello', { object: [{ name: 'hello', type: 'string' }] })

router.register({
  category: 'demo',
  description: 'hello world',
  method: 'GET',
  path: '/hello',
  body: [
    { name: 'abc', type: 'number' },
    { name: 'def', type: { array: { type: 'string' } } },
  ],
  response: {
    object: [{ name: 'key', type: 'string' }],
  },
  handler({ response }) {
    response.json({ hello: 'world' })
  },
})

router.register({
  category: 'demo',
  method: 'POST',
  path: '/hello',
  response: { ref: 'hello' },
  handler({ response }) {
    response.json({ hello: 'world post' })
  },
})

registerSwaggerRoute(router)

startHTTPServer({
  handler: router.handle,
  logger: logger.getChild('http'),
  port: 8801,
})
