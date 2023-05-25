import express from 'express'
import {quickApi} from "../../middlewares/quickApi"
import {api} from '../../middlewares/api'
import {timeout} from "../../middlewares/timeout"
import {getModel} from "../../middlewares/getModel"
import {env} from "../../config/env"
import {metricsMid} from "../../middlewares/metrics"
import {asyncRoute} from '../../middlewares/expressAsync'

/**
 * This is the base meta-class for all routers.
 * It overrides all methods of default express.router.
 */
export class BasicRouter {
  // Router name
  NAME() { return "Basic"}
  // The list of handlers(aka. middlewares)
  BASIC_HANDLERS() {
    return [
      api.getRequestHeader(),
    ]
  }
  // Key name in kwgard for the route id
  ROUTE_ID_KEY() { return "id" }

  constructor() {
    this.router = express.Router()
  }

  /**
   * Generate the handler list based on the conditional params.
   * @param {array} handlers List of handlers
   * @param {dict} kwargs Key:value parameters used to generate/filter handlers and as input params of them
   * @returns {array} List of handlers
   */
  conditionalHandlers(handlers, kwargs) {
    return handlers || []
  }

  /**
   * Returns the final handler list for the router definition.
   * It concatenates default handlers of the class and conditional handlers.
   * @param {array} handlers Input handlers
   * @param {dict} kwargs Conditional params
   * @returns {array} Final handler list
   */
  #fHandlers(handlers, kwargs) {
    let r = [
      ...this.BASIC_HANDLERS(),
      ...this.conditionalHandlers(handlers, kwargs)
    ]
    return r
  }

  preflight(path, method, kwargs) {
    return
  }

  get(path, handlers=[], kwargs={}) {
    this.preflight(path, "get", kwargs)
    this.router.get(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  post(path, handlers=[], kwargs={}) {
    this.preflight(path, "post", kwargs)
    this.router.post(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  put(path, handlers=[], kwargs={}) {
    this.preflight(path, "put", kwargs)
    this.router.put(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  patch(path, handlers=[], kwargs={}) {
    this.preflight(path, "patch", kwargs)
    this.router.patch(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  delete(path, handlers=[], kwargs={}) {
    this.preflight(path, "delete", kwargs)
    this.router.delete(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  options(path, handlers=[], kwargs={}) {
    this.preflight(path, "options", kwargs)
    this.router.options(path, ...this.#fHandlers(handlers, kwargs))
    return this
  }

  /**
   * Return router object
   * @returns {express.Router()}
   */
  build() {
    return this.router
  }
}


/***
 * This is the base class which defines initial handlers for quick apis.
 *  - Set api id
 *  - Set request timeout
 *  - Parse auth token
 *  - Validate the client status and api visability
 */
export class QuickRouter extends BasicRouter {

  NAME() {return "Quick"}
  BASIC_HANDLERS() {
    return [
      ...super.BASIC_HANDLERS(),
      api.setId(this.apiId),
      quickApi.globalTimeout(this.NAME()),
      quickApi.parseAuthToken,
      getModel.client,
      quickApi.validateClient,
      quickApi.validateApiVisibility,
    ]
  }

  constructor({isPublic=false}) {
    super()
    this.apiId = "default"
    this.isPublic = isPublic
  }

  conditionalHandlers(handlers, kwargs) {
    if (this.isPublic) {
      return [
        api.setPublic(),
        quickApi.enforceCors,
        quickApi.validateAuthToken({secretKey: 'exposedSecret'}),
        quickApi.rateLimit(),
        timeout.blowIfTimedout,
        metricsMid.stopwatch('api:validateRecaptcha', [
          timeout.ensure({id: 'recaptcha-validation', timeoutSecs: env.quickApiRecaptchaTimeout}, [
            quickApi.validateRecaptcha,
          ]),
        ]),
        timeout.blowIfTimedout,
        metricsMid.stopwatch('api:parseRequestBody', [
          timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
            quickApi.parseRequestBody,
          ]),
        ]),
        quickApi.validateBodyData,
        ...handlers,
      ]
    }
    return [
      api.setPrivate(),
      quickApi.validateAuthToken({secretKey: 'secret'}),
      quickApi.rateLimit({ip: false}),
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,
      ...handlers,
    ]
  }

  preflight(path, method, kwargs) {
    if (this.ROUTE_ID_KEY() in kwargs) {
      this.apiId = kwargs[this.ROUTE_ID_KEY()]
    }
    this.#enforcePreflightCors(path)
    return super.preflight(path, method, kwargs)
  }

  #enforcePreflightCors(path) {
    if (this.isPublic) {
      this.router.options(path,
        api.setPublic(),
        api.setId(this.apiId),
        timeout.ensure({id: 'full-route', timeoutSecs: 1.0}),
        quickApi.enforcePreflightCors,
        asyncRoute(async (req, res) => {
          res.status(200).end()
        }),
      )
    }
  }
}
