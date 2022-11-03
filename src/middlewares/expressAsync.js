import {logger} from '../instrumentation/logger'

export function asyncRoute(func) {
  return asyncMiddleware('route', func, {typename: 'async', skipNextCallOnSuccess: true})
}

export function asyncMiddleware(name, func, {typename='asyncMiddleware', skipNextCallOnSuccess=false}={}) {
  return async (req, res, next) => {
    logger.debugverbose(`[${typename}:${name}] Starting`)
    let nextCalled = false
    const wrappedNext = (...args) => {
      if (nextCalled) {
        logger.debugverbose(`[asyncMiddleware:${name}] next was called already. skipping call`)
        return
      }
      nextCalled = true
      if (skipNextCallOnSuccess && args.length === 0) {
        logger.debugverbose(`[asyncMiddleware:${name}] skip next call on success is enabled. skipping call`)
        return
      }
      logger.debugverbose(`[${typename}:${name}] Calling Next: ${args}`)
      next(...args)
      logger.debugverbose(`[${typename}:${name}] After Next`)
    }
    const promise = asPromise(async () => {
      return func(req, res, wrappedNext)
    })
    return await promise.then(() => wrappedNext()).catch(wrappedNext)
  }
}

export async function invokeMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    const next = (arg) => {
      asPromise(arg).then(resolve).catch(reject)
    }
    asPromise(async () => middleware(req, res, next))
  })
}

export async function invokeMiddlewares(middlewares, req, res) {
  for (let i = 0; i < middlewares.length; i++) {
    const middleware = middlewares[i]
    await invokeMiddleware(middleware, req, res)
  }
}

async function asPromise(obj) {
  if (typeof(obj) === 'function') {
    const f = async () => obj()
    obj = f()
  }
  if (obj instanceof Error) {
    return Promise.reject(obj)
  } else if (obj && !!obj.error) {
    return Promise.reject(obj.error)
  } else {
    return Promise.resolve(obj)
  }
}
