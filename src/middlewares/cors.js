import {helpers} from '../routes/helpers'
import {asyncMiddleware} from './expressAsync'
import {envShared} from "../shared/envShared"
import {Uri} from '../models/tools/Uri'
import {api} from './api'
import {RichError} from '../utils/RichError'

export const cors = new (class {
  enforceCors({hosts, methods, headers}) {
    return asyncMiddleware('cors.enforceCors', async (req, res, next) => {
      const host = helpers.getOrigin(req)
      const normalizedHost = cors.#normalizeHostForCors(host, req.protocol)
      if (!host || !hosts || !hosts.length) {
        throw cors.#newCorsError({
          message: "Couldn't get origin or allowed origins aren't configured",
          details: {
            originOnHeader: host,
            originNormalized: normalizedHost,
            allowed: {hosts, methods, headers,},
          }
        })
      }
      const normalizedAllowedHosts = []
      for (let i = 0; i < hosts.length; i++) {
        const allowedHost = cors.#normalizeHostForCors(hosts[i], 'https')
        normalizedAllowedHosts.push(allowedHost)
      }
      if (!normalizedAllowedHosts.includes(normalizedHost)) {
        throw cors.#newCorsError({
          message: "Origin on header doesn't match the allowed ones for this client",
          details: {
            originOnHeader: host,
            originNormalized: normalizedHost,
            allowed: {hosts, methods, headers,},
          },
        })
      }
      helpers.setCors(res, {
        hosts: hosts,
        methods: methods,
        headers: headers,
      })
    })
  }

  #newCorsError({message, details={}}) {
    return new RichError({
      publicId: 'not-authorized',
      debugId: 'cors-block',
      httpCode: 403,
      debugMessage: message,
      debugDetails: details,
      publicMessage: 'Not Authorized',
      logLevel: 'debug',
    })
  }

  #normalizeHostForCors(host, defaultProtocol) {
    if (!host) return
    const uri = new Uri(host)
    if (!uri.protocol) uri.protocol = defaultProtocol
    return uri.toString({path: false})
  }
})()
