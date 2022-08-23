import {logger} from '../instrumentation/logger'
import {RichError} from '../utils/RichError'
import {TagSet} from '../utils/TagSet'

export const api = new (class {
  setId(apiId) {
    return (req, res, next) => {
      res.locals.dentApiId = apiId
      this.addInfo(res, {api: apiId})
      next()
    }
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
    const reqInfo = api.#pick(req, ['route', 'method', 'headers', 'protocol', 'query', 'baseurl', 'ip', 'originalurl', 'path'])
    return reqInfo
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
    return keys.reduce((k,o) => Object.assign(o, {[k]: obj[k]}), {})
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
