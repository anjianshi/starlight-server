import path from 'node:path'
import { getFileDir } from '@anjianshi/utils/env-node/index.js'
import {
  getLogger,
  startHTTPServer,
  type BaseContext,
  type Route,
  type PathParameters,
  Router,
} from '@/index.js'
import { registerSwaggerRoute } from '@/swagger/index.js'

const logger = getLogger({
  level: 'debug',
  debugLib: '*',
  file: {
    dir: path.resolve(getFileDir(import.meta), '../../logs'),
  },
})

type DemoContext = BaseContext & {
  now: () => number
}
class DemoRouter extends Router<DemoContext> {
  async executeWithContext(
    baseContext: BaseContext,
    route: Route<DemoContext>,
    pathParameters: PathParameters,
  ) {
    const context: DemoContext = {
      ...baseContext,
      now: () => Date.now(),
    }
    await route.handler(context, pathParameters)
  }
}
const router = new DemoRouter()

router.registerResponseReference('hello', { object: [{ name: 'hello', type: 'string' }] })

router.register({
  category: 'demo',
  description: 'hello world',
  method: 'GET',
  path: '/hello',
  query: [
    { name: 'q1', type: 'number', required: true },
    { name: 'q2', type: 'string', description: '这是q2' },
  ],
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
