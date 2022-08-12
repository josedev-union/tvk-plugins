import {helpers} from '../routes/helpers'
import {envShared} from "../shared/envShared"
import {Uri} from '../models/tools/Uri'

export const cors = new (class {
  enforceCors({hosts, methods, headers}) {
    return async (req, res, next) => {
      return await helpers.redirectCatch(next, async () => {
        const host = helpers.getReferer(req)
        if (!host || !hosts || !hosts.length) {
          return helpers.respondError(res, 403, 'Unauthorized Domain')
        }
        const normalizedHost = cors.#normalizeHostForCors(host, req.protocol)
        const normalizedAllowedHosts = []
        for (let i = 0; i < hosts.length; i++) {
          const allowedHost = cors.#normalizeHostForCors(hosts[i], 'https')
          normalizedAllowedHosts.push(allowedHost)
        }
        if (!normalizedAllowedHosts.includes(normalizedHost)) {
          return helpers.respondError(res, 403, 'Unauthorized Domain')
        }
        helpers.setCors(res, {
          hosts: hosts,
          methods: methods,
          headers: headers,
        })
        next()
      })
    }
  }

  #normalizeHostForCors(host, defaultProtocol) {
    const uri = new Uri(host)
    if (!uri.protocol) uri.protocol = defaultProtocol
    return uri.toString({path: false})
  }
})()
