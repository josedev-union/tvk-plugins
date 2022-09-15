import {logger} from '../instrumentation/logger'
import {RichError} from '../utils/RichError'
import {TagSet} from '../utils/TagSet'

export const api = new (class {
  setId({apiId, clientIsFrontend=false}) {
    if (clientIsFrontend) {
      apiId = `public-${apiId}`
    }
    return (req, res, next) => {
      res.locals.dentApiId = apiId
      this.addInfo(res, {api: apiId})
      next()
    }
  }

  corsOnError() {
    return (req, res, next) => {
      res.locals.dentCorsOnError = true
      next()
    }
  }

  newNotFoundError() {
    return new RichError({
      httpCode: 404,
      publicId: 'not-found',
      publicMessage: 'Not Found',
      logLevel: undefined,
    })
  }

  getTags(res) {
    if (!res.locals.dentApiTags) {
      res.locals.dentApiTags = new TagSet()
    }
    return res.locals.dentApiTags
  }

  addTags(res, newTags) {
    api.getTags(res).add(newTags)
  }

  getId(res) {
    return res.locals.dentApiId
  }

  getInfo(res) {
    return res.locals.dentApiInfo || {}
  }

  getReqInfo(req) {
    return api.#pick(req, ['method', 'headers', 'protocol', 'query', 'baseurl', 'ip', 'originalurl', 'path'])
  }

  getEnvInfo() {
    return {
      env: env.name,
      logLevel: env.logLevel,
      isProduction: env.isProduction(),
      isStaging: env.isStaging(),
      isTest: env.isTest(),
      isDevelopment: env.isDevelopment(),
      isLocal: env.isLocal(),
      isNonLocal: env.isNonLocal(),
    }
  }

  addInfo(res, extraInfo) {
    const info = api.getInfo(res)
    res.locals.dentApiInfo = Object.assign(info, extraInfo)
  }

  convertToRichError(err, req, res, next) {
    const richError = RichError.fromError(err)
    if (!richError) {
      logger.warn("Can't convert it to RichError", err)
      return next(err)
    }
    const requestInfo = api.getReqInfo(req)
    const apiInfo = api.getInfo(res)
    richError.addDebugDetails({
      requestInfo, apiInfo
    })
    api.addTags(res, richError.tags)
    return next(richError)
  }

  #pick(obj, keys) {
    return keys.reduce((o,k) => Object.assign(o, {[k]: obj[k]}), {})
  }

  #tagsFor(req, res) {
    const apiId = getId(res)
    const tags = new TagSet({
      'api:id': apiId,
      'api:route': req.route,
      'req:method': req.method,
      'req:protocol': req.protocol,
    })
  }
})()
