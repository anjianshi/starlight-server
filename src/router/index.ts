/**
 * 实现路由注册
 * Implement route registration
 *
 * Usage:
 * const router = new DefaultRouter()
 * router.register('GET', '/hello/:name', async ({ request, response }: { request: Request, response: ResponseUtils }, params: { name: string }) => {
 *   response.json({ hello: params.name })
 * })
 * startHTTPServer({
 *   handler: router.handle
 *   ...
 * })
 *
 * Usage With Custom Context:
 * interface MyContext extends BaseContext {
 *   foo: () => void
 * }
 * class MyRouter extends BaseRouter<MyContext> {
 *   executeWithContext(baseContext: BaseContext, route: Route<MyContext>, params: PathParamaters) {
 *     function foo() { console.log('bar') }
 *     const context = { ...baseContext, foo }
 *     route.handle(context)
 *   }
 * }
 * const router = new MyRouter()
 * router.register('GET', '/foobar', async ({ request, response, foo }) => {
 *   foo()
 *   response.json({})
 * })
 * startHTTPServer({
 *   handler: router.handle
 *   ...
 * })
 */
export * from './router.js'
export { type PathParameters } from './match.js'
export type { BasicDataType, Parameter, BasicParameter, ParameterDataType } from './parameters.js'
