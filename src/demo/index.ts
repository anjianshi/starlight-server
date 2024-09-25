import path from 'node:path'
import { getDirectoryPath } from '@anjianshi/utils/env-node/index.js'
import { getLogger, startHTTPServer, Router } from '@/index.js'

const logger = getLogger({
  level: 'debug',
  debugLib: '*',
  file: {
    dir: path.resolve(getDirectoryPath(import.meta), '../../logs'),
  },
})

// declare module '@/index.js' {
//   interface Context {
//     now: () => number
//   }
// }

const router = new Router()
router.setCors(true)
router.bindSwagger()
router.setExecutor(async (basicContext, route) => {
  await route.handler({
    ...basicContext,
    // now: () => Date.now(),
  })
})

const swagger = router.swagger
swagger.registerResponse(
  'hello',
  swagger.response({
    hello: swagger.string(),
  }),
)

router.register({
  method: 'GET',
  path: '/hello',
  document: {
    category: 'demo',
    description: 'hello world',
    query: {
      q1: { schema: swagger.number(), required: true },
      q2: { schema: swagger.number(), description: '这是q2' },
      q3: swagger.boolean(),
    },
    body: {
      abc: swagger.number(),
      def: swagger.array(swagger.string()),
    },
    response: {
      name: swagger.string(),
    },
  },
  handler(ctx) {
    ctx.response.json({ name: 'world' })
  },
})

router.register({
  method: 'POST',
  path: '/hello',
  document: {
    category: 'demo',
    response: swagger.ref('response', 'hello'),
  },
  handler({ response }) {
    response.json({ hello: 'world' })
  },
})

startHTTPServer({
  handler: router.handle,
  logger: logger.getChild('http'),
  port: 8801,
})
