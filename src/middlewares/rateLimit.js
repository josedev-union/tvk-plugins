import {helpers} from '../routes/helpers'
import {RateLimit} from '../models/database/RateLimit'
import onFinished from 'on-finished'

export function rateLimit({limit, expiresIn, lookup = (req, res) => req.ip, onBlocked=null, countIf=null}) {
  return async (req, res, next) => {
    return await helpers.redirectCatch(next, async () => {
      const limitObj = new RateLimit({limit: limit, expiresIn: expiresIn})
      const ids = lookup.apply(limitObj, [req, res])
      const allowed = await limitObj.useSlotFrom(ids, true)
      if (allowed) {
        onFinished(res, function(err, res) {
          if (countIf === null || countIf.apply(limitObj, [req, res])) {
            limitObj.manualCountFor(ids)
          }
        })
        return next()
      } else {
        if (onBlocked) {
          onBlocked(req, res, next)
        } else {
          return helpers.respondError(res, 429, "Too Many Requests")
        }
      }
    })
  }
}
