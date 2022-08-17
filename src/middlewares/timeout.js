import onFinished from 'on-finished'
import onHeaders from 'on-headers'

import {helpers} from '../routes/helpers'
import {TimeoutManager} from '../models/tools/TimeoutManagerV2'

export const timeout = new (class {
  getManager(res) {
    let manager = res.locals.dentTimeout
    if (!manager) {
      res.locals.dentTimeout = manager = new TimeoutManager()
      onFinished(res, () => manager.clearAll())
      onHeaders(res, () => manager.clearAll())
    }
    return manager
  }

  ensure(timeoutSecs, middlewares=null) {
    if (middlewares) return timeout.#localEnsure(timeoutSecs, middlewares)
    else return timeout.#globalEnsure(timeoutSecs)
  }

  async blowIfTimedout(req, res, next) {
    const manager = timeout.getManager(res)
    await manager.blowIfTimedout()
    return next()
  }

  #globalEnsure(timeoutSecs) {
    return async (req, res, next) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
      manager.start(timeoutSecs)
      return next()
    }
  }

  #localEnsure(timeoutSecs, middlewares) {
    return async (req, res, next) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
      const timeoutId = manager.start(timeoutSecs)

      const lastNext = () => {
        manager.clear(timeoutId)
        return next()
      }

      const joinedNexts = middlewares.reverse().reduce((prevNext, middleware) => {
        const prevNextWrapped = async () => {
          await manager.blowIfTimedout()
          return prevNext()
        }
        return async () => {
          return await Promise.resolve(middleware(req, res, prevNextWrapped))
        }
      }, lastNext)

      return await joinedNexts()
    }
  }

  async #asPromise(obj) {
    if (typeof(obj) === 'function') {
      const f = async () => obj()
      obj = f()
    }
    return Promise.resolve(obj)
  }
})()
