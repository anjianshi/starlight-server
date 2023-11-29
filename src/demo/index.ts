import path from 'node:path'
import { getFileDir } from '@anjianshi/utils/env-node/index.js'
import { getLogger, startHTTPServer, DefaultRouter } from '@/index.js'
// import { registerSwaggerRoute } from '@/swagger/index.js'

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
  method: 'GET',
  path: '/hello',
  response: { ref: 'hello' },
  handler({ response }) {
    response.json({ hello: 'world' })
  },
})

// registerSwaggerRoute(router)

startHTTPServer({
  handler: router.handle,
  logger: logger.getChild('http'),
  port: 8801,
})
