import onFinished from 'on-finished'
import onHeaders from 'on-headers'

import {helpers} from '../routes/helpers'
import {TimeoutManager} from '../models/tools/TimeoutManagerV2'
import {asyncMiddleware, invokeMiddleware} from './expressAsync'

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

  get blowIfTimedout() {
    return asyncMiddleware('timeout.blowIfTimedout', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
    })
  }

  #globalEnsure(timeoutSecs) {
    return asyncMiddleware('timeout.#globalEnsure', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
      manager.start(timeoutSecs)
    })
  }

  #localEnsure(timeoutSecs, middlewares) {
    return asyncMiddleware('timeout.#localEnsure', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()

      await manager.exec(timeoutSecs, async () => {
        for(let i = 0; i < middlewares.length; i++) {
          const middleware = middlewares[i]
          await invokeMiddleware(middleware, req, res)
        }
      })
    })
  }

  async #asPromise(obj) {
    if (typeof(obj) === 'function') {
      const f = async () => obj()
      obj = f()
    }
    return Promise.resolve(obj)
  }
})()
