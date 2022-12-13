import {logger} from '../instrumentation/logger'
import {RichError} from '../utils/RichError'
import {TagSet} from '../utils/TagSet'
import {env} from '../config/env'

export const api = new (class {
  #callbacks = null

  setId({apiId, clientIsFrontend=false}) {
    if (clientIsFrontend) {
      apiId = `public-${apiId}`
    }
    return (req, res, next) => {
      res.locals.dentApiId = apiId
      res.locals.dentIsFrontendRoute = clientIsFrontend
      this.#setup(req, res)
      next()
    }
  }

  addCallback(callbackId, func) {
    if (!this.#callbacks) this.#callbacks = {}
    if (!this.#callbacks[callbackId]) this.#callbacks[callbackId] = []
    this.#callbacks[callbackId].push(func)
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
      id: 'not-found',
      publicMessage: 'Not Found',
      logLevel: undefined,
    })
  }

  newServerError({httpCode=500, id='internal-server-error', publicMessage='Internal Server Error', debugMessage}={}) {
    return new RichError({
      httpCode,
      id,
      publicMessage,
      debugMessage: debugMessage || publicMessage,
      logLevel: 'error',
    })
  }

  getTags(res) {
    if (!res.locals.dentApiTags) {
      res.locals.dentApiTags = new TagSet()
    }
    return res.locals.dentApiTags
  }

  addTags(res, newTags) {
    const allTags = api.getTags(res)
    allTags.add(newTags)
    this.#callCallbacks('tags.add', {
      allTags: allTags.tags,
      addedTags: new TagSet(newTags).tags,
    })
  }

  getId(res) {
    return res.locals.dentApiId
  }

  getInfo(res) {
    return res.locals.dentApiInfo || {}
  }

  addInfo(res, extraInfo) {
    const info = api.getInfo(res)
    res.locals.dentApiInfo = Object.assign(info, extraInfo)
    this.#callCallbacks('info.add', {addedInfo: extraInfo, allInfo: info})
  }

  convertToRichError(err, req, res, next) {
    const richError = RichError.fromError(err)
    if (!richError) {
      logger.warn("Can't convert it to RichError", err)
      return next(err)
    }
    const info = api.getInfo(res)
    richError.addDebugDetails(info)
    api.addTags(res, richError.tags)
    return next(richError)
  }

  #setup(req, res) {
    const {dentIsFrontendRoute: isFrontEndRoute} = res.locals
    const apiId = this.getId(res)
    const requestInfo = this.#getReqInfo(req)
    const envInfo = this.#getEnvInfo()
    this.addInfo(res, {
      api: {
        id: apiId,
        isFrontEndRoute,
      },
      request: requestInfo,
      env: envInfo,
    })

    this.addTags(res, this.#tagsFor(req, res))
  }

  #tagsFor(req, res) {
    const {dentIsFrontendRoute: isFrontEndRoute} = res.locals
    const apiId = this.getId(res)
    const originalTags = {
      'api:id': apiId,
      "api:isFrontEndRoute": String(isFrontEndRoute),
      'req:method': req.method,
      'req:protocol': req.protocol,
      "env:name": env.name,
    }
    return new TagSet(originalTags)
  }

  #getReqInfo(req) {
    return api.#pick(req, ['method', 'headers', 'protocol', 'query', 'baseurl', 'ip', 'originalurl', 'path'])
  }

  #getEnvInfo() {
    return {
      name: env.name,
    }
  }

  #pick(obj, keys) {
    return keys.reduce((o,k) => Object.assign(o, {[k]: obj[k]}), {})
  }

  #callCallbacks(callbackId, params) {
    if (!this.#callbacks || !this.#callbacks[callbackId]) return
    for (let callback of this.#callbacks[callbackId]) {
      callback(params)
    }
  }
})()
