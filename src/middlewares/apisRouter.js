import express from 'express'
import {quickApi} from "./quickApi"
import {api} from './api'
import {timeout} from "./timeout"
import {getModel} from "./getModel"
import {env} from "../config/env"
import {logger} from '../instrumentation/logger'
import {asyncRoute} from './expressAsync'
import {metricsMid} from "./metrics"

export const apisRouter = new (class {
  newRouterBuilder(addRoutes) {
    return ({clientIsFrontend = false}) => apisRouter.#buildRouter({clientIsFrontend, addRoutes})
  }

  #buildRouter({clientIsFrontend, addRoutes}) {
    const router = express.Router()
    const pathsAdded = new Set()
    const pathsWithOptions = new Set()
    const newApiRoute = ({apiId, method, path, middlewares = []}, route) => {
      middlewares = apisRouter.#addBaseMiddlewares(middlewares, {apiId, clientIsFrontend})

      method = method.toLowerCase()
      router[method](path, [
        ...middlewares
      ], route)
      pathsAdded.add([path, apiId])
      if (method === 'options') {
        pathsWithOptions.add(path)
      }
    }

    addRoutes(newApiRoute)
    if (clientIsFrontend) {
      apisRouter.#addCorsPreflightRoutes(router, {pathsAdded, pathsWithOptions})
    }
    return router
  }

  #addBaseMiddlewares(middlewares, {clientIsFrontend, apiId}) {
    const setCorsFlag = []
    if (clientIsFrontend) {
      setCorsFlag.push(api.corsOnError())
    }
    return [
      // before
      api.setId({apiId, clientIsFrontend}),
      timeout.ensure({id: 'full-route', timeoutSecs: env.quickApiRouteTimeout}),
      ...setCorsFlag,
      quickApi.parseAuthToken,
      getModel.client,
      quickApi.validateClient,
      quickApi.validateApiVisibility,

      // frontend-call or backend-call middlewares
      ...apisRouter.#getApiTypeMiddlewares({clientIsFrontend}),

      // after
      metricsMid.stopwatch('api:parseRequestBody', [
        timeout.ensure({httpCodeOverride: 408, id: 'parse-body', timeoutSecs: env.quickApiInputUploadTimeout}, [
          quickApi.parseRequestBody,
        ]),
      ]),
      quickApi.validateBodyData,

      ...middlewares,
    ]
  }

  #getApiTypeMiddlewares({clientIsFrontend}) {
    if (clientIsFrontend) {
      return [
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
      ]
    } else {
      return [
        quickApi.validateAuthToken({secretKey: 'secret'}),
        quickApi.rateLimit({ip: false}),
      ]
    }
  }

  #addCorsPreflightRoutes(router, {pathsAdded, pathsWithOptions}) {
    pathsAdded.forEach(([path, apiId]) => {
      if (!pathsWithOptions.has(path)) {
        apisRouter.#addCorsPreflight(router, {path, apiId})
      }
    })
  }

  #addCorsPreflight(router, {path, apiId}) {
    router.options(path,
      api.setId(apiId),
      timeout.ensure({id: 'full-route', timeoutSecs: 1.0}),
      quickApi.enforcePreflightCors,
      asyncRoute(async (req, res) => {
        res.status(200).end()
      }),
    )
  }
})()
