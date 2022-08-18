import onFinished from 'on-finished'
import onHeaders from 'on-headers'

import {helpers} from '../routes/helpers'
import {TimeoutManager} from '../models/tools/TimeoutManagerV2'
import {asyncMiddleware, invokeMiddleware} from './expressAsync'
import {RichError} from '../utils/RichError'

export const timeout = new (class {
  getManager(res) {
    let manager = res.locals.dentTimeout
    if (!manager) {
      res.locals.dentTimeout = manager = new TimeoutManager({
        onBlow: (data) => {
          const id = manager.expiredTimeoutId
          throw new RichError({
            publicId: 'timeout',
            httpCode: data.extraData.overrideHttpCode || 504,
            publicMessage: 'Operation took too long',
            debugMessage: `Operation id:${data.id} took too long.`,
            logAsWarning: true,
            tags: {
              'error:timeout': data.id,
            },
          })
        }
      })
      onFinished(res, () => manager.clearAll())
      onHeaders(res, () => manager.clearAll())
    }
    return manager
  }

  ensure({id, timeoutSecs, overrideHttpCode}, middlewares=null) {
    if (middlewares) return timeout.#localEnsure({id, timeoutSecs, overrideHttpCode}, middlewares)
    else return timeout.#globalEnsure({id, timeoutSecs, overrideHttpCode})
  }

  get blowIfTimedout() {
    return asyncMiddleware('timeout.blowIfTimedout', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
    })
  }

  #globalEnsure({id, timeoutSecs, overrideHttpCode}) {
    return asyncMiddleware('timeout.#globalEnsure', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()
      manager.start(timeoutSecs, {id, extraData: {overrideHttpCode}})
    })
  }

  #localEnsure({id, timeoutSecs, overrideHttpCode}, middlewares) {
    return asyncMiddleware('timeout.#localEnsure', async (req, res) => {
      const manager = timeout.getManager(res)
      await manager.blowIfTimedout()

      await manager.exec(timeoutSecs, async () => {
        for(let i = 0; i < middlewares.length; i++) {
          const middleware = middlewares[i]
          await invokeMiddleware(middleware, req, res)
        }
      }, {id, extraData: {overrideHttpCode}})
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
