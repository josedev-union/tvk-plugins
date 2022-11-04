import {helpers} from '../routes/helpers'
import {asyncMiddleware} from './expressAsync'
import {envShared} from "../shared/envShared"
import {Uri} from '../models/tools/Uri'
import {api} from './api'
import {RichError} from '../utils/RichError'

export const cors = new (class {
  enforceCors({hosts, methods, headers, skipValidation=false}) {
    return asyncMiddleware('cors.enforceCors', async (req, res, next) => {
      if (skipValidation) {
        helpers.setAllowingCors(req, res)
        return
      }
      const origin = helpers.normalizedOriginForCors(req)
      if (!origin || !hosts || !hosts.length) {
        throw cors.#newCorsError({
          message: "Couldn't get origin or allowed origins aren't configured",
          details: {
            originNormalized: origin,
            allowed: {hosts, methods, headers,},
          }
        })
      }
      const normalizedAllowedHosts = []
      for (let i = 0; i < hosts.length; i++) {
        const allowedHost = helpers.normalizeOrigin(hosts[i], 'https')
        normalizedAllowedHosts.push(allowedHost)
      }
      if (!normalizedAllowedHosts.includes(origin)) {
        throw cors.#newCorsError({
          message: "Origin on header doesn't match the allowed ones for this client",
          details: {
            originNormalized: origin,
            allowed: {hosts, methods, headers,},
          },
        })
      }
      helpers.setAllowingCors(req, res)
    })
  }

  #newCorsError({message, details={}}) {
    return new RichError({
      httpCode: 403,
      id: 'not-authorized',
      subtype: 'cors-block',
      debugMessage: message,
      debugDetails: details,
      publicMessage: 'Not Authorized',
      logLevel: 'debug',
    })
  }
})()
